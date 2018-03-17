
class Box256 {

  constructor(wrapper) {

    this.wrapper = wrapper;

    this.pallete = new Pallete();

    // Base cell size
    this.cellSize = 16;

    // Amount of lines in editor
    this.linesCount = 32;

    // Rows and cols of screen
    const APP_WIDTH = 70;
    const APP_HEIGHT = this.linesCount + 10;

    this.viewRows = APP_HEIGHT;

    this.view = new ViewRender({
      wrapper: this.wrapper,
      width: APP_WIDTH * this.cellSize,
      height: APP_HEIGHT * this.cellSize,
      cellSize: this.cellSize,
      onReady: () => {
        this.viewReady();
      }
    });

    // Currently hovered cell
    this.hoverCell = {
      x:0, y: 0
    };


    this.memCellOffset = {x: 20, y: 3};

    this.bgColor = this.pallete.black;


    this.stepDelay = 15;


    this.targetScreen = new ScreenRender(this.view, {
      x: 30, y: 19
    });

    this.screen = new ScreenRender(this.view, {
      x: 30, y: 3
    });

    this.editor = new CodeEditor(this.view, {
      x: 4, y: 3
    }, this.linesCount);

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

    this.memCount = 0;

    this.levels = getLevels();

    setTimeout(() => {
      this.attachListeners()
    }, 50);

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

  viewReady() {
    this.editor.draw();

    this.view.drawHelp({x: 47, y: 3}, 22.3);

    this.memoryBox.draw();

    this.screen.draw(true);

    this.targetScreen.draw();

    // Add lines to 6th line from bottom
    this.buttonLine = this.viewRows - 6;

    this.addButton(5, 1, 'SAVE', () => {
      this.save();
    });

    this.addButton(12, 1, 'LOAD', () => {
      this.load();
    });

    this.addButton(6, this.buttonLine, 'STOP', () => {
      this.stop();
    }, true);

    this.addButton(13, this.buttonLine, 'STEP', () => {
      this.step();
    });

    this.addButton(20, this.buttonLine, 'PLAY', () => {
      this.run();
    });

    this.addButton(30, this.buttonLine, 'PREV', () => {
      this.level--;
      if (this.level < 0) {
        this.level = this.levels.length - 1;
      }
      this.loadLevel();
    });

    this.addButton(40, this.buttonLine, 'NEXT', () => {
      this.level++;
      if (this.level >= this.levels.length) {
        this.level = 0;
      }
      this.loadLevel();
    });

    this.drawCycles(0);

    this.drawAllocated(this.getUsedLines(), false)

    this.init();
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
    this.drawCycles(this.cycles, true);

    // Draw active memory
    this.drawAllocated(this.getUsedLines(), true)

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
      this.getButton('PLAY').disable();
    } else {
      clearTimeout(this.stepTimeout);
      this.getButton('PLAY').enable();
    }

    // Count cycles
    this.cycles++;
    this.drawCycles(this.cycles, true);

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
    this.drawCycles(this.cycles);

    // Put memory back
    this.memoryBox.restoreMemory();

    // Reset pixels screen
    this.screen.resetScreen();

    // Draw active memory
    this.drawAllocated(this.getUsedLines(), false)

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
      var memoryLines = 64;

      nextLine = (line + results.jumpOffset) % memoryLines

      //nextLine = line + results.jumpOffset;
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

    let bright = true;
    this.drawLevelDone(bright, true);
    this.levelDoneInterval = setInterval(() => {
      bright = !bright;
      this.drawLevelDone(bright, true);
    }, 500);
  }

  drawLevelDone(bright, show) {
    let text = '--= LEVEL DONE =--';
    let color = bright ? 'lightgreen' : 'green';
    if (!show) {
      // Replace text with spaces
      text = new Array(text.length).fill(' ');
      color = 'black';
    }
    this.view.drawText(text, {x: 7, y: this.viewRows - 2}, color);
  }

  beforeButtonClick() {
    if (this.levelDoneInterval) {
      clearInterval(this.levelDoneInterval);
      this.levelDoneInterval = null;
      this.drawLevelDone(false, false);
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
    this.drawAllocated(this.memCount, false);
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
    if (cell.y != this.buttonLine && cell.y != 1) return;
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
      if (this._hoveredButton.disabled) return;
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
        x: ~~(e.offsetX / this.cellSize),
        y: ~~(e.offsetY / this.cellSize)
      };
      this.onHoverCell(this.hoverCell);
    });

    this.wrapper.addEventListener('mousedown',(e) => {
      e.preventDefault();
    });

    this.wrapper.addEventListener('click',(e) => {
      this.onClick();
    });
  }

  save() {
    this.editor.disableEvents = true;
    const popup = this.openPopup();

    const text =  document.createElement('textarea');
    popup.appendChild(text);

    const b =  document.createElement('button');
    popup.appendChild(b);
    b.innerText = 'OK';
    b.onclick = () => {
      this.closePopup();
    }

    let lastNotEmpty = 0;
    let lines = [];
    for (i =0 ;i < this.linesCount;i++) {
      let line = this.editor.getLine(i);
      if (line !== '000000000000') {
        lastNotEmpty = i;
      }
      lines.push(line);
    }
    lines = lines.slice(0,lastNotEmpty + 1);
    text.value = lines.join('\n');
  }

  load() {
    this.editor.disableEvents = true;
    const popup = this.openPopup();

    const text =  document.createElement('textarea');
    popup.appendChild(text);

    const b =  document.createElement('button');
    popup.appendChild(b);
    b.innerText = 'Load';
    b.onclick = () => {
      this.loadCode(text.value.toUpperCase().split("\n"));
      this.closePopup();
    }

    const c =  document.createElement('button');
    popup.appendChild(c);
    c.innerText = 'Cancel';
    c.onclick = () => {
      this.closePopup();
    }
  }

  closePopup() {
    if (this.popup) {
      document.body.removeChild(this.popup);
      this.editor.disableEvents = false;
      this.popup = null;
    }
  }
  openPopup() {
    this.closePopup();
    this.editor.disableEvents = true;
    const popup = document.createElement('div');
    popup.className = 'popup';
    document.body.appendChild(popup);
    this.popup = popup;
    return popup;
  }

  loadCode(lines) {
    for (let i=0;i<this.linesCount;i++) {
      const chars = lines[i] || '';
      this.editor.setLineChars(i, chars);
    }
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

  getCurrentLevel() {
    return this.currentLevel;
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


  drawAllocated(count, active) {
    var offset = {
      x: 19,
      y: this.viewRows - 4
    };
    var countStr = count.toString(16).toUpperCase();
    if (countStr.length == 1) {
      countStr = '0' + countStr;
    }
    this.view._text('LOC:', offset.x, offset.y, 'grey');
    this.view._text(countStr, offset.x + 5, offset.y, active ? 'yellow':'grey');
  }

  drawCycles(count, active) {
    var offset = {
      x:6,
      y: this.viewRows - 4
    };
    this.view._text('CYCLES:', offset.x, offset.y, 'grey');

    var countStr;
    var color = active ? 'orange' : 'grey';
    if (!count) {
      countStr = '0000'
    } else {
      countStr = count.toString(16).toUpperCase()
      var leadZeros = 4 - countStr.length;
      if (leadZeros > 0) {
        countStr = new Array(leadZeros).fill('0').join('') + countStr;
      } else {
        countStr = countStr.substr(-4);
      }
    }
    this.view._text(countStr, offset.x + 8, offset.y, color);
  }

}






