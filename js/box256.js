
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
      this.onUpdateLine(line, chars);
    });

    this.editor.on('lineShift', (line, count, dir) => {
      this.onLineShift(line, count, dir);
    });

    this.memoryBox = new BoxMemory(this.view, {
      x: 20, y: 3
    });


    this.commandRunner = new CommandRunner(this.screen, this.memoryBox);
    this.commandList = new CommandList();
    this.compiler = new CommandCompiler();

    this.view.onReady(() => {

      this.editor.draw();

      this.memoryBox.draw();

      this.screen.draw(true);

      this.targetScreen.draw();

      this.addButton(6, 36, 'STOP', () => {
        this.stop();
      }, true);

      this.addButton(13, 36, 'STEP', () => {
        this.step();
      });

      this.addButton(20, 36, 'PLAY', () => {
        this.run();
      });

      this.addButton(30, 36, 'PREV', () => {
        this.level--;
        if (this.level < 0) {
          this.level = this.levels.length - 1;
        }
        this.loadLevel();
      });

      this.addButton(40, 36, 'NEXT', () => {
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

    this.levels = getLevels();

  }

  getButton(text) {
    for (var i = 0; i < this.buttons.length; i++) {
      if (this.buttons[i].text === text) {
        return this.buttons[i];
      }
    }
  }

  addButton(x, y, text, callback, disabled) {
    if (!this.buttons) {
      this.buttons = [];
    }

    this.buttons.push(new Button(this.view, {
      x: x,
      y: y,
      text: text,
      handler: callback,
      disabled: disabled || false
    }));
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
    this.getButton('PLAY').disable();
    this.step(true);
  }

  prepareToRun() {

    // Stop cursor blicking
    this.editor.pause();

    // Save copy of memory to restore state
    // before run
    this.memoryBox.freezeMemory();

    // Clear previous step timeout if exists
    clearTimeout(this.stepTimeout);

    this.screen.resetScreen();

    // Lets count cycles
    this.cycles = 0;
    this.view.drawCycles(this.cycles, true);

    // Draw active memory
    this.view.drawAllocated(this.getUsedLines(), true)

    this.createdThread = -1;
    this.threads = [0];

    this.running = true;

    this.getButton('STOP').enable();

    this.drawActiveLines(this.threads);
  }

  step(async) {
    if (!this.running) {
      this.prepareToRun();
      return;
    }

    if (async) {
      this.stepTimeout = setTimeout(() => {
        this.step(true);
      }, this.stepDelay);
    } else {
      clearTimeout(this.stepTimeout);
      this.getButton('PLAY').enable();
    }

    // Count cycles
    this.cycles++;
    this.view.drawCycles(this.cycles, true);

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

  stop() {
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
    this.editor.start();

    this.getButton('STOP').disable();
    this.getButton('PLAY').enable();

    this.running = false;
  }

  runInstruction(line) {
    var instruction = this.memoryBox.getLineBytes(line);
    var cmd = instruction[0];

    var results = this.commandRunner.exec(instruction);

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
      } else if (nextLine < 0) {
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

  onLevelCompleted() {
    // Pause execusion
    clearTimeout(this.stepTimeout);
    this.getButton('PLAY').enable();

    var colors = ['lightgreen', 'green'];
    var index = 0;
    this.view.drawText('--= LEVEL DONE =--', {x: 7, y:40}, colors[index]);
    this.levelDoneInterval = setInterval(() => {
      index = index ? 0 : 1
      this.view.drawText('--= LEVEL DONE =--', {x: 7, y:40}, colors[index]);
    }, 500);
  }

  beforeButtonClick() {
    if (this.levelDoneInterval) {
      clearInterval(this.levelDoneInterval);
      this.levelDoneInterval = null;
      this.view.drawText('                  ', {x: 7, y:40}, 'black');
    }
  }

  isLevelReady(cmdCode) {
    var cmdName = this.commandList.getCommandName(cmdCode);
    if (cmdName == 'PIX') {
      var pixels = this.screen.getPixels()
      var level = this.getCurrentLevel();
      if (pixels.join('') === level) {
        return true;
      }
    }

    return false;
  }

  drawUnactiveLines(lines) {
    lines.forEach(line => {
      this.editor.drawSelectionLine(line, false);
      this.memoryBox.drawMemoryLine(line, false);
    });
  }

  drawActiveLines(lines) {
    lines.forEach(line => {
      this.editor.drawSelectionLine(line, true);
      this.memoryBox.drawMemoryLine(line, true);
    });
  }

  onUpdateLine(line, chars) {
    // Put correct opcodes to memory on according line
    const res = this.compiler.compile(chars);
    this.memoryBox.updateMemoryLine(line, res.opcode, res.valid);

    this.affectedLines();
  }

  onLineShift(line, dir) {
    this.memoryBox.shiftLines(line, dir);
  }

  affectedLines(line) {
    this.memCount = this.memoryBox.count();
    this.view.drawAllocated(this.memCount, false);
  }

  getUsedLines() {
    return this.memCount;
  }


  onHoverCell() {

    /*
    var index = this.cellInMemory(this.hoverCell);
    if (index > -1) {
      this.hoverMemory(index);
    } else if (this.hoveredMemCell != -1) {
      this.hoverMemory(-1);
    }
    */

    var button = this.findButton(this.hoverCell);
    if (button) {
      if (button !== this._hoveredButton) {
        if (this._hoveredButton) {
          this._hoveredButton.blur();
        }
        this._hoveredButton = button;
        button.focus();
      }
    } else if (this._hoveredButton) {
      this._hoveredButton.blur();
      this._hoveredButton = null;
    }
  }

  findButton(cell) {
    // Only those lines has buttons
    if (cell.y != 36 && cell.y != 1) return;
    for (var i = 0; i < this.buttons.length; i++) {
      let b = this.buttons[i];
      if (b.disabled) continue;
      if (cell.x < b.x || cell.x >= b.x + b.w) {
        continue;
      }
      if (cell.y == b.y) {
        return b;
      }
    }
  }

  onClick() {
    if (this._hoveredButton) {
      this.beforeButtonClick()
      this._hoveredButton.click();
      return;
    }

    if (this.running) {
      return;
    }

    this.editor.onClick(this.hoverCell);
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
    });

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






