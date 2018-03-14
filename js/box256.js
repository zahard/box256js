
class Box256 {

  constructor(wrapper) {

    this.pallete = {
      black: '#111111',
      blue: '#354367',
      bordo: '#6c3652',
      green: '#4f7f58',

      brick: '#965b46',
      grey: '#5d5751',
      silver: '#c2c3c7',
      white: '#fefefe',

      red: '#d74f5e',
      orange: '#e7a856',
      yellow: '#fef877',
      lightgreen: '#6ddd64',

      lightblue: '#6baef1',
      purple: '#7f7a97',
      pink: '#df8ba9',
      cream: '#f0ceb4',
    }

    this.width = 800;
    this.height = 840;

    this.gridSize = 16;

    this.wrapper = wrapper;

    this.hoverCell = {
      x:0, y: 0
    }

    // Amount of lines in editor
    this.linesCount = 32;

    // Where active area start
    this.cellsOffset = {x: 4, y: 3};
    this.memCellOffset = {x: 20, y: 3};

    this.bgColor = this.pallete.black;


    this.stepDelay = 15;

    setTimeout(() => {
      this.attachListeners()
    }, 500);


    this.cmdManager = new CommandManager(this.screen);

    this.view = new ViewRender({
      wrapper: this.wrapper,
      height: this.height,
      width: this.width,
      cellSize: this.gridSize,
      lines: this.linesCount,
      pallete: this.pallete
    });

    this.targetScreen = new ScreenRender(this.view, {
      x: 30, y: 19
    });

    this.screen = new ScreenRender(this.view, {
      x: 30, y: 3
    });

    this.editor = new CodeEditor(this.view, {
      x: 4, y: 3
    }, this.pallete);


    this.editor.on('lineUpdate', (line, chars) => {
      this.onUpdateLine(line, chars)
    });

    this.view.onReady(() => {

      this.editor.draw();

      this.memoryBox.draw();

      this.screen.draw(true);

      this.targetScreen.draw();



      this.buttons = [];

      this.stopButton = this.addButton(6, 36, 'STOP', () => {
        this.stop();
      }, true);

      this.addButton(13, 36, 'STEP', () => {
        this.step();
      });

      this.playButton = this.addButton(20, 36, 'PLAY', () => {
        this.run();
      });

      this.prevLevelButton = this.addButton(30, 36, 'PREV', () => {
        this.level--;
        if (this.level < 0) {
          this.level = this.levels.length - 1;
        }
        this.loadLevel();
      });

      this.nextLevelButton = this.addButton(40, 36, 'NEXT', () => {
        this.level++;
        if (this.level >= this.levels.length) {
          this.level = 0;
        }
        this.loadLevel();
      });

      this.view.drawCycles(0);

      this.view.drawAllocated(this.getUsedLines(), false)

      this.init();
    });

    this.memCount = 0;

    this.memoryBox = new BoxMemory(this.view, this.cmdManager);

    this.cmdManager.setMemory(this.memoryBox);

    this.levels = getLevels();

  }

  addButton(x, y, text, callback, disabled) {
    var w = text.length + 2;
    var button = {
      handler: callback,
      disabled: disabled || false,
      x: x,
      y: y,
      w: w,
      text: text
    };
    this.buttons.push(button);
    this.view.drawButton(button);
    return button;
  }

  init() {
    this.running = false;
    this.loadFirstLevel();
    this.editor.runCursor(false);
  }

  run() {
    if (!this.running) {
      this.prepareToRun();
    }
    this.step(true);

    this.playButton.disabled = true;
    this.view.drawButton(this.playButton);
  }

  prepareToRun() {

    // Stop cursor blicking
    this.resetCursorInterval();

    // Remove cursor
    this.drawCursor(false);

    // Save copy of memory to restore state
    // before run
    this.memoryBox.freezeMemory();

    // Clear previous step timeout if exists
    clearTimeout(this.stepTimeout);

    // Lets count cycles
    this.cycles = 0;

    this.screen.resetScreen();

    // Draw active memory
    this.view.drawAllocated(this.getUsedLines(), true)

    this.createdThread = -1;
    this.threads = [0];

    this.running = true;

    this.stopButton.disabled = false;
    this.view.drawButton(this.stopButton);

    this.drawActiveLines(this.threads);
  }

  step(async) {
    if (!this.running) {
      this.prepareToRun();
    } else {
      if (!async) {
        clearTimeout(this.stepTimeout);
        this.playButton.disabled = false;
        this.view.drawButton(this.playButton);

      } else {
        this.stepTimeout = setTimeout(() => {
          this.step(true);
        }, this.stepDelay);
      }

      // Count cycles
      this.cycles++;
      this.view.drawCycles(this.cycles);

      // Deactivate current line
      this.drawUnactiveLines(this.threads);

      this.memoryBox.setReadLock();

      // Level ready on this step
      var completed = false;

      for (var thx = 0; thx < this.threads.length; thx++) {
        // Execute line command

        let next = this.runInstruction(this.threads[thx]);

        // If level ready
        if (next == -1) {
          completed = true;
          // Force to next line
          next = this.threads[thx] + 1;
        }

        // Check if we have more lines to run
        if (next >= this.linesCount) {
          next = 0;
        }

        // Update curent line index
        this.threads[thx] = next;
      }

      this.memoryBox.releaseReadLock();


      if (this.createdThread != -1) {
        // Push new thread before next step
        this.threads.push(this.createdThread);
        this.createdThread = -1;
      }

      // Hightlight next line(s)
      this.drawActiveLines(this.threads);

      if (completed) {
        this.onLevelCompleted();
      }

    }

  }

  stop(completed) {
    if (!this.running) return;

    // stop timeout
    clearTimeout(this.stepTimeout);

    // Deactivate current line
    this.drawUnactiveLines(this.threads);

    // Reset step
    this.threads = [];


    this.cycles = 0;
    this.view.drawCycles(this.cycles);

    // Put memory back
    this.memoryBox.restoreMemory();

    // Reset pixels screen
    this.screen.resetScreen();

    // Draw active memory
    this.view.drawAllocated(this.getUsedLines(), false)

    // Run cursor
    this.runCursor(false);

    this.running = false;

    this.stopButton.disabled = true;
    this.view.drawButton(this.stopButton);

    this.playButton.disabled = false;
    this.view.drawButton(this.playButton);
  }

  runInstruction(line) {
    var idx = line * 4;
    var cmd = this.memoryBox.getByte(idx);
    var a = this.memoryBox.getByte(idx+1);
    var b = this.memoryBox.getByte(idx+2);
    var c = this.memoryBox.getByte(idx+3);

    var results = this.cmdManager.exec(cmd, [a,b,c]);

    // By default run next line
    var nextLine = line + 1;

    // After each PIX instruction check if
    // level goal is complete
    if (this.isLevelReady(cmd)) {
      return -1;
    }

    // If no additional action required - continue
    if (!results) {
      return nextLine;
    }

    if (typeof results.createdThread !== 'undefined') {
      var thread = this.getNextInstuctionByByte(results.createdThread)
      // Created new thread from line
      this.createdThread = thread;
    }

    // If command change execution line
    if (typeof results.jumpTo !== 'undefined') {
      nextLine = this.getNextInstuctionByByte(results.jumpTo);
    // If need to jump relatively
    } else if (typeof results.jumpOffset !== 'undefined') {
      nextLine = line + results.jumpOffset;
      if (nextLine > this.linesCount) {
        nextLine = nextLine % this.linesCount;
      } else if(nextLine < 0) {
        nextLine = this.linesCount - nextLine;
      }
    }

    return nextLine;
  }

  getNextInstuctionByByte(byteIndex) {
    var tmp = byteIndex % 4;
    var line;
    if (tmp !== 0 ) {
      line = (~~(byteIndex/4)) + 1;
    } else {
      line = byteIndex/4;
    }
    return line;
  }


  cellInEditor(cell) {
    var line = cell.y - this.cellsOffset.y;
    var rowPos =  cell.x - this.cellsOffset.x;
    if (line > -1 && line < this.linesCount
        && rowPos > -1 && rowPos < this.cellsInRow + 3)
    {
      rowPos = rowPos - ~~(rowPos / 4);
      var pos = line * this.cellsInRow + rowPos;
      return pos;
    }
    return -1;
  }


  onLevelCompleted() {
    // Pause execusion
    clearTimeout(this.stepTimeout);
    this.playButton.disabled = false;
    this.view.drawButton(this.playButton);

    var colors = ['lightgreen', 'green'];
    var index = 0;
    this.view.drawText('--= LEVEL DONE =--', {x: 7, y:40}, colors[index]);
    this.levelDoneInterval = setInterval(() => {
      index = index ? 0 : 1
      this.view.drawText('--= LEVEL DONE =--', {x: 7, y:40}, colors[index]);
    }, 500);
  }

  buttonClicked() {
    if (this.levelDoneInterval) {
      clearInterval(this.levelDoneInterval);
      this.levelDoneInterval = null;
      this.view.drawText('                  ', {x: 7, y:40}, 'black');
    }
  }

  isLevelReady(cmd) {
    var cmdName = this.cmdManager.getCommandName(cmd);
    if (cmdName == 'PIX') {
      var pixels = this.screen.getPixels()
      var level = this.getCurrentLevel();
      if (pixels.join('') === level) {
        return true;
      }
    }

    return false;
  }




  onUpdateLine(line, chars) {
    // Put correct opcodes to memory on according line
    this.memoryBox.updateMemoryLine(line, chars);
    this.affectedLines();
  }

  affectedLines(line) {
    this.memCount = this.memoryBox.count();
    this.view.drawAllocated(this.memCount, false);
  }

  getUsedLines() {
    return this.memCount;
  }


  onHoverCell() {
    return
    var index = this.cellInMemory(this.hoverCell);
    if (index > -1) {
      this.hoverMemory(index);
    } else if (this.hoveredMemCell != -1) {
      this.hoverMemory(-1);
    }

    var button = this.cellInButton(this.hoverCell);
    if (button) {
      if (this._hoveredButton !== button) {
        if (this._hoveredButton) {
          this._hoveredButton.active = false;
          this.view.drawButton(this._hoveredButton);
        }
        button.active = true;
        this._hoveredButton = button;
        this.view.drawButton(button);
      }
    } else if (this._hoveredButton) {
      this._hoveredButton.active = false;
      this.view.drawButton(this._hoveredButton);
      this._hoveredButton = null;
    }
  }

  cellInButton(cell) {
    if (cell.y != 36 && cell.y != 1) return;
    var b;
    for (var i =0; i < this.buttons.length; i++) {
      b = this.buttons[i];
      if (cell.x < b.x || cell.x >= b.x + b.w) {
        continue;
      }
      if (cell.y == b.y) {
        return b;
      }
    }

  }

  onClick() {
    return;
    var pos = this.running ? -1 : this.cellInEditor(this.hoverCell);
    if (pos > -1) {
      this.moveCursorToPos(pos)
    } else if (this._hoveredButton && !this._hoveredButton.disabled) {
      this.buttonClicked()
      this._hoveredButton.handler();
    }
  }

  cellInMemory(cell) {
    var col = cell.x - this.memCellOffset.x;
    if (col < 0 || col > 7) return -1;

    var line = cell.y - this.memCellOffset.y;
    if (line < 0 || line >= this.linesCount) return -1;

    var pos = line * 4 + (~~(col/2));
    return pos;
  }

  hoverMemory(index) {
    if (this.hoveredMemCell === index) {
      return;
    }

    // Restore old value
    if (this.hoveredMemCell > -1) {
      this.memoryBox.restoreHovered();
    }

    this.hoveredMemCell = index;
    if (index < 0) return;

    this.memoryBox.drawMemoryIndex(index, true);
  }


  attachListeners() {

    this.wrapper.addEventListener('mousemove',(e) => {
      this.hoverCell = {
        x: ~~(e.offsetX / this.gridSize),
        y: ~~(e.offsetY / this.gridSize)
      };
      this.onHoverCell(this.hoverCell);
    })

    this.wrapper.addEventListener('click',(e) => {
      this.onClick();
    });
  }


  loadProgramm(lines) {
    lines.forEach((chars, line) => {
      this.editor.setLineChars(line, chars);
    });
  }

  loadFirstLevel() {
    this.level = 1;
    this.loadLevel();
    this.loadProgramm([
      'MOV022@40',
      'MOV030@50',
      'PIX@40001',
      'ADD@40*50@40',
      'ADD@41001@41',
      'JGR00B@41-0C',
      'MOV000@41',
      'ADD@50001@50',
      'JMP@08',
      '',
      '',
      '',
      '001010-01-10',
    ]);
  }

  loadLevel() {
    if (this.running) {
      this.stop()
    }
    this.currentLevel = this.levels[this.level];
    this.drawLevel();
    this.screen.resetScreen();
  }

  drawLevel() {
    var level = this.getCurrentLevel();
    var x,y,c;
    for (var p = 0; p < level.length; p++) {
      x = p % 16;
      y = ~~(p / 16);
      c = parseInt(level[p],16);
      this.targetScreen.drawPixel(x,y, c)
    }
  }

  getCurrentLevel() {
    return this.currentLevel;
  }

}






