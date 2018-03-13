
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

    this.wrapper.style.width = this.width + 'px';
    this.wrapper.style.height = this.height + 'px';

    this.hoverCell = {
      x:0, y: 0
    }

    // Active area width
    this.cellsInRow = 12;

    // Amount of lines in editor
    this.linesCount = 32;

    this.activeSelection = [];
    this.clipboard = [];

    // Where active area start
    this.cellsOffset = {x: 4, y: 3};
    this.memCellOffset = {x: 20, y: 3};

    this.maxCursorPos = this.cellsInRow * this.linesCount - 1;
    this.cursor = false; // display reversed or usual
    this.setCursor(0);

    this.charsArraySize = this.cellsInRow * this.linesCount;
    // Map of chars in editor and their colors
    this.chars = new Array(this.cellsInRow * this.linesCount).fill('0')
    this.colorMap = new Array(this.cellsInRow * this.linesCount);

    this.bgColor = this.pallete.black;

    this.commandColors = {
      'MOV': 'green',
      'PIX': 'pink',
      'JMP': 'bordo',
      'JNE': 'brick',
      'JEQ': 'brick',
      'JGR': 'brick',
      'ADD': 'purple',
      'SUB': 'purple',
      'MUL': 'purple',
      'DIV': 'purple',
      'MOD': 'purple',
      'THR': 'yellow',
      'FLP': 'green',
    }

    this.stepDelay = 15;

    setTimeout(() => {
      this.attachListeners()
    }, 500);

    this.targetScreen = new ScreenRender({
      y: 19 * 16, x: 30 * 16
    });

    this.screen = new ScreenRender({
      y: 3 * 16, x: 30 * 16
    });

    this.cmdManager = new CommandManager(this.screen);

    this.view = new ViewRender({
      wrapper: this.wrapper,
      height: this.height,
      width: this.width,
      cellSize: this.gridSize,
      lines: this.linesCount,
      pallete: this.pallete
    });

    this.editor = new CodeEditor(this.view, this.pallete);

    this.view.onReady(() => {

      this.editor.draw();

      // Draw background default data

      //this.view.drawTemplate();

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

      this.screen.layer = this.view.layers.back;
      this.targetScreen.layer = this.view.layers.back;


      this.init();
    });

    this.memCount = 0;

    this.memoryBox = new BoxMemory(this.view, this.cmdManager);

    this.cmdManager.setMemory(this.memoryBox);

    this.levels = getLevels();

    this.actionsBuffer = new ActionsBuffer(this);

    this.linesValue = new Array(this.linesCount).fill(0);

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
    this.editor.runCursor(false);
    return;
    this.level = 0;
    this.runCursor(false);
    this.running = false;
    this.loadFirstLevel()
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

  getCellPosition(pos) {
    var y = ~~(pos / this.cellsInRow);
    var x = pos % this.cellsInRow;

    // Skip gaps between bytes
    x+= ~~(x / 3);

    return {
      x: this.cellsOffset.x + x,
      y: this.cellsOffset.y + y,
    }
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

  getCursorCell() {
    return this.getCellPosition(this.cursorPos);
  }


  resetCursorInterval() {
    clearInterval(this.cursorInterval);
  }

  runCursor(initalValue) {
    this.cursor = initalValue;
    this.drawCursor();
    clearInterval(this.cursorInterval);
    this.cursorInterval = setInterval(()=>{
      this.cursor = !this.cursor;
      this.drawCursor()
    }, 500);
  }


  drawCursor(value) {
    if (typeof value == 'undefined') {
      value = this.cursor;
    }

    var char = this.chars[this.cursorPos];
    var color = this.colorMap[this.cursorPos] || 'grey';
    if (value) {
      this.view.drawText(char, this.activeCell, 'black', '#fff');
    } else {
      this.view.drawText(char, this.activeCell, color, this.bgColor);
    }
  }

  selectLines(dir) {
    if (!this.activeSelection.length) {
      var line = ~~(this.cursorPos/this.cellsInRow);
      this.activeSelection.push(line);
      this.moveCursor(dir);
      this.drawActiveCharLine(line);
    } else {

      if (this.activeSelection.length == this.linesCount) {
        return;
      }

      var line = ~~(this.cursorPos/this.cellsInRow);
      var nextLine = (line == (this.linesCount - 1)) ? 0 : line + 1;
      var prevLine = (line == 0) ? this.linesCount - 1 : line - 1;

      if (dir == 1) {
        if (this.activeSelection[0] == nextLine) {
          this.activeSelection.unshift(line);
          this.moveCursor(dir);
          this.drawActiveCharLine(line);
        } else {
          this.activeSelection.pop();
          this.moveCursor(dir);
          this.drawUnactiveCharLine(prevLine);
        }
      } else {
        // down
        if (this.activeSelection[this.activeSelection.length-1] == prevLine) {
          this.activeSelection.push(line);
          this.moveCursor(dir);
          this.drawActiveCharLine(line);
        } else {
          this.activeSelection.unshift();
          this.moveCursor(dir);
          this.drawUnactiveCharLine(nextLine);
        }
      }

    }
  }

  resetSelection() {
    this.activeSelection.forEach(l => {
      this.drawUnactiveCharLine(l);
    });
    this.activeSelection = [];
  }


  copySelection() {
    this.clipboard = this.activeSelection.map(l => {
      return this.getLineChars(l);
    });
    this.resetSelection();
  }

  pasteSelection() {
    if (!this.clipboard.length) return;
    var line = ~~(this.cursorPos/this.cellsInRow);
    var chars = [];
    for (var i = 0; i< this.clipboard.length;i++) {
      chars.push(this.getLineChars(line + i));
      this.putLineChars(this.clipboard[i], line + i);
    }

    var oldChars = [].concat.apply([], chars).join('');
    var newChars = [].concat.apply([], this.clipboard).join('');
    if (oldChars !== newChars) {
      this.actionsBuffer.add({
        type: 'paste',
        line: line,
        cur: line * this.cellsInRow,
        oldVal: chars,
        newVal: this.clipboard.slice()
      });
    }
  }

  removeChar() {
    this.setChar('0');
    this.drawCursor(this.cursor);
  }

  removeCharBack() {
    if (this.cursorPos < 1) {
      return;
    }

    this.moveCursor(CurosorDir.left)
    this.saveChar(this.cursorPos, '0', this.cursorPos + 1);
    this.setCharToPos(this.cursorPos, '0');
    this.drawCursor(true)
  }

  onDelete() {
    var pos = this.cursorPos;
    var rowPos = pos % this.cellsInRow;
    // If cursor on first char - delete all line
    if (rowPos == 0) {
      this.removeCurrentLine();
    } else {
      // Delete single char
      this.removeChar()
    }
  }

  insertNewLine(stayOnLine, line, chars, skipBuffer) {
    if(!line) {
      line = ~~(this.cursorPos/this.cellsInRow);
    }
    var nextLine = stayOnLine ? line : line + 1;

    if (nextLine >= this.linesCount) {
      return;
    }

    var pos = nextLine * this.cellsInRow;

    // Hide cursor before copy part of screen
    this.drawCursor(false);

    // PUsh new line chars
    var newLineArgs = chars ? chars : new Array(this.cellsInRow).fill('0');

    newLineArgs.unshift(pos, 0);
    Array.prototype.splice.apply(this.chars, newLineArgs);

    // Trim array
    var removedChars = this.chars.splice(this.charsArraySize);

    // PUsh new line colors
    var newColorsArgs = new Array(this.cellsInRow).fill('grey');
    newColorsArgs.unshift(pos, 0);
    Array.prototype.splice.apply(this.colorMap, newColorsArgs);
    // Trim array
    this.colorMap.splice(this.charsArraySize);

    // Shift memory
    this.memoryBox.insertMemoryLine(nextLine);

    var hoverMemory = -1;
    if (this.hoveredMemCell > -1) {
      hoverMemory = this.hoveredMemCell;
      this.hoverMemory(-1);
    }

    this.view.moveLines(this.getCellPosition(pos), this.linesCount - nextLine, 24, 1);

    // Update new line
    this.updateLine(nextLine);

    if (hoverMemory) {
      this.hoverMemory(hoverMemory);
    }

    // Put cursor on new line
    this.moveCursorToPos(pos);

    if (!skipBuffer) {
      this.actionsBuffer.add({
        type: 'insertLine',
        line: nextLine,
        cur: stayOnLine ? pos : pos - this.cellsInRow,
        prevCur: pos,
        chars: removedChars
      });
    }

  }

  removeCurrentLine(line, skipBuffer) {
    if (this.editorEmpty()) {
      return;
    }

    if (!line) {
      var line = ~~(this.cursorPos/this.cellsInRow);
    }

    var pos = line * this.cellsInRow; // next row position

    // Hide cursor before copy part of screen
    this.drawCursor(false);

    if (!skipBuffer) {
      this.actionsBuffer.add({
        type: 'deleteLine',
        line: line,
        chars: this.getLineChars(line),
        cur: pos
      });
    }

    // Remove line chars
    this.chars.splice(pos, this.cellsInRow);
    // PUsh new line chars
    var newLine = new Array(this.cellsInRow).fill('0');
    Array.prototype.push.apply(this.chars, newLine);

    // Colors
    this.colorMap.splice(pos, this.cellsInRow);
    // PUsh new line chars
    var newLine = new Array(this.cellsInRow).fill('grey');
    Array.prototype.push.apply(this.colorMap, newLine);

    // Shift memory
    this.memoryBox.deleteMemoryLine(line);

    var nextLine = line + 1;
    var cell = this.getCellPosition(nextLine * this.cellsInRow);


    var hoverMemory = -1;
    if (this.hoveredMemCell > -1) {
      hoverMemory = this.hoveredMemCell;
      this.hoverMemory(-1);
    }

    this.view.moveLines(cell, this.linesCount - nextLine, 24, -1);

    // Draw new line at the end
    this.updateLine(this.linesCount - 1);

    if (hoverMemory) {
      this.hoverMemory(hoverMemory);
    }

    // update cursor
    this.moveCursorToPos(pos);
  }

  insertChar(char, type) {
    //CHeck is char valid for current cursor position
    var pos = this.cursorPos;
    var rowPos = pos % this.cellsInRow;
    var valid = false;
    switch (type) {
      case "num":
        if (!(rowPos > 0 && rowPos % 3 == 0) || rowPos < 3) {
          this.setChar(char);
          valid = true;
        } else if (char == '0' && rowPos > 0 && rowPos % 3 == 0) {
          // Clear ref symbol and move righr
          this.setChar('0');
          valid = true;
        }

        break;
      case "mem":
      case "ref":
      case "min":
        if (rowPos > 0 && rowPos % 3 == 0) {
          this.setChar(char);
          valid = true;
        }
        break;
      case "text":
        if (rowPos < 3) {
          this.setChar(char);
          valid = true;
        }
        break;
      case "space":
        if (rowPos % 3 == 0) {
          // Just move cursor right from cmd byte
          valid = true;
        }
        break;
    }

    if (valid) {
      this.moveCursor(CurosorDir.right);
    }
  }

  setCharToPos(pos, char) {
    this.putChar(pos, char)
    this.updateByte(~~(pos/3));
  }

  setChar(char) {
    var pos = this.cursorPos;
    this.saveChar(pos, char);
    this.setCharToPos(pos, char);
  }

  saveChar(pos, char, saveCursor) {
    if (char !== this.chars[pos]) {
      var cur = saveCursor || pos;
      var prevCur = saveCursor ? saveCursor - 1 : cur + 1;
      this.actionsBuffer.add({
        pos: pos,
        type: 'char',
        oldVal: this.chars[pos],
        newVal: char,
        cur: cur,
        prevCur: prevCur
      });
    }
  }


  putChar(pos, char) {
    this.chars[pos] = char;
  }

  drawDataChar(pos) {
    var cell = this.getCellPosition(pos);
    var char = this.chars[pos];
    var color = this.colorMap[pos] || 'grey';
    this.view.drawText(char, cell, color, this.bgColor);
  }

  drawActiveLines(threads) {
    threads.forEach(line => {
      this.drawActiveCharLine(line);
      this.memoryBox.drawMemoryLine(line, false, true);
    });
  }

  drawUnactiveLines(threads) {
    threads.forEach(line => {
      this.drawUnactiveCharLine(line);
      this.memoryBox.drawMemoryLine(line, false, false);
    });
  }

  redrawLine(line) {
    this.drawCharsLine(line);
    this.memoryBox.drawMemoryLine(line, false, false);
  }

  drawActiveCharLine(line) {
    const start = line * this.cellsInRow;
    for (let i = 0; i < 12; i++) {
      const pos = start + i;
      const cell = this.getCellPosition(pos);
      const char = this.chars[pos];
      this.view.drawText(char, cell, 'black', '#fff');

      // Fill space between columns
      if (i > 0 && i % 3 == 0) {
        this.view.drawColor({x: cell.x - 1, y: cell.y}, '#fff');
      }
    }
  }

  drawUnactiveCharLine(line) {
    const start = line * this.cellsInRow;
    for (let i = 0; i < 12; i++) {
      this.drawDataChar(start + i);
      // Fill space between columns
      if (i > 0 && i % 3 == 0) {
        const cell = this.getCellPosition(start + i);
        this.view.drawColor({x: cell.x - 1, y: cell.y}, this.bgColor);
      }
    }
  }


  drawByteChars(byteIndex) {
    var s = byteIndex * 3;
    for (i=0; i < 3; i++) {
      this.drawDataChar(s+i);
    }
  }

  getByteChars(byteIndex) {
    var s = byteIndex * 3;
    return this.chars.slice(s, s+3);
  }

  getLineChars(line) {
    var s = line * this.cellsInRow;
    return this.chars.slice(s, s + this.cellsInRow);
  }

  updateByte(byteIndex) {
    var line = this.getByteLineIndex(byteIndex);
    this.updateLine(line);
  }

  updateLine(line) {
    this.updateLineColors(line);
    this.drawCharsLine(line);
    // Put correct opcodes to memory on according line
    this.memoryBox.updateMemoryLine(line, this.getLineBytes(line));
    this.affectedLines();
  }

  affectedLines(line) {
    this.memCount = this.memoryBox.count();
    this.view.drawAllocated(this.memCount, false);
  }

  getUsedLines() {
    return this.memCount;
  }

  getLineBytes(line) {
    var bytes = [];
    var byte = '';
    var chars = this.getLineChars(line);
    for (var i = 0; i < chars.length; i++) {
      byte += (chars[i] ? chars[i] : '0');
      if ((i + 1 )% 3 == 0) {
        bytes.push(byte);
        byte = '';
      }
    }
    return bytes;
  }

  getByteLineIndex(byteIndex) {
    return ~~(byteIndex / 4);
  }

  editorEmpty() {
    for (var i=0; i< this.chars.length; i++) {
      if (this.chars[i] !== '0') {
        return false;
      }
    }
    return true;
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

    this.wrapper.addEventListener('mouseleave',(e) => {
      //TODO HANDLE
    })

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

    window.addEventListener('keydown',function(e) {

      const code = e.keyCode;

      /*
      if (code == 91 || e.key == "Meta" || code == 17 || code == 16) {
        return;
      }

      if (code == 90 && (e.ctrlKey || e.metaKey) ) {
        this.actionsBuffer.undo();
        return;
      }

      if (code == 89 && (e.ctrlKey || e.metaKey) ) {
        this.actionsBuffer.redo();
        return;
      }

      if (code == 86 && (e.ctrlKey || e.metaKey) ) {
        this.pasteSelection();
        return;
      }

      if (this.activeSelection.length) {
        if (code == 67 && (e.ctrlKey || e.metaKey) ) {
          this.copySelection();
          return;
        }

        if (code != 16  && !(e.shiftKey && (code == 38 || code == 40))) {
          this.resetSelection();
        }
      }
      */

      /*
      if (e.key == 'Tab') {
        e.preventDefault();
        return;
      } else if (e.keyCode == 46) {// delete
        this.onDelete();
        return;
      } else if (e.keyCode == 8) {// backspace
        this.removeCharBack();
        e.preventDefault();
        return;
      } else if (e.keyCode == 13) {// Enter
        this.insertNewLine(e.shiftKey);
        return;
      }*/


      // Validate input
      if (/^[0-9a-zA-Z\@\*\-]$/.test(e.key)) {
        this.editor.insertChar(e.key.toUpperCase());
      }

      if (code > 36 && code <  41) {
        e.preventDefault();
        this.editor.moveCursor(code - 37);
      }

      return;

      if (/^[0-9a-fA-F]$/.test(e.key)) {
        this.insertChar(e.key.toUpperCase(), 'num');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        this.insertChar(e.key.toUpperCase(), 'text');
      } else if (e.key == "@") {
        this.insertChar('@', 'mem');
      } else if (e.key == "-") {
        this.insertChar('-', 'min');
      } else if (e.key == "*") {
        this.insertChar('*', 'ref');
      } else if (code == 32) {
        this.insertChar('', 'space');
      } else if (code > 36 && code <  41) {
        e.preventDefault();
        if (e.shiftKey && code % 2 == 0) {
          this.selectLines(code - 37);
        } else {
          this.moveCursor(code - 37);
        }
      }


    }.bind(this));
  }

  moveCursor(dir) {
    var pos = this.cursorPos;
    var next = pos;

    //Check if we can move
    switch(dir) {
      case CurosorDir.left:
        if (pos > 0) {
          next--;
        } else {
          next = this.maxCursorPos;
        }
        break;
      case CurosorDir.right:
        if (pos < this.maxCursorPos) {
          next++;
        } else {
          next = 0;
        }
        break;
      case CurosorDir.up:
        next = pos - this.cellsInRow;
        if (next < 0) {
          next = this.maxCursorPos + next + 1;
        }
        break;
      case CurosorDir.down:
        next = pos + this.cellsInRow;
        if (next > this.maxCursorPos) {
          next = next - this.maxCursorPos - 1;
        }
        break;
    }

    if (next != this.cursorPos) {
      this.moveCursorToPos(next);
    }

  }

  moveCursorToPos(pos) {
    this.resetCursorInterval();
    // Draw previous value as is
    this.drawCursor(false);

    this.setCursor(pos);
    this.runCursor(true);
  }

  setCursor(pos) {
    this.cursorPos = pos;
    this.activeCell = this.getCursorCell();
  }


  loadProgramm(lines) {
    lines.forEach((line, i) => {
      this.putLineChars(line, i);
    });
  }

  putLineChars(line, lineIdx) {
    var pos = lineIdx * this.cellsInRow;

    // Put chars in line
    for (var i = 0; i < this.cellsInRow; i++) {
      var char = line[i] || '0';
      this.putChar(pos + i, char);
    }

    this.updateLine(lineIdx);
  }

  updateLineColors(lineIdx) {
    var byteIndex = lineIdx * 4;
    var requiredArgs = this.updateCommandByteColor(byteIndex);
    var required;
    for (var i = 1; i <= 3; i++) {
      required = i <= requiredArgs;
      this.updateByteColor(byteIndex + i, required);
    }
  }

  updateCommandByteColor(byteIndex) {
    var byte = this.getByte(byteIndex);
    // If valid command exists
    if (this.commandColors[byte]) {
      this.setByteColor(byteIndex, this.commandColors[byte]);
      return this.cmdManager.getCommandRequiredArgs(byte);
    } else {
      // If commmand byte is constant value
      if ( /^[0-9A-F]{3}$/.test(byte) ) {
        this.updateByteColor(byteIndex, 0);
      } else {
        // Disable invalid command
        this.setByteColor(byteIndex, 'grey');
      }
    }
    return 0;
  }

  // Numeric byte
  updateByteColor(byteIndex, required) {
    var byte = this.getByte(byteIndex);

    // Empty byte
    if (byte === '000' && !required) {
      this.setByteColor(byteIndex, 'grey');
    } else {
      var colors = [
        this.getNumModifierColor(byte[0]),
        'white',
        'white'];

      this.setByteColors(byteIndex, colors);
    }
  }

  setByteColor(byteIndex, color) {
    var s = byteIndex * 3;
    for (i = 0; i < 3; i++) {
      this.colorMap[s + i] = color;
    }
  }

  setByteColors(byteIndex, colors) {
    var s = byteIndex * 3;
    for (i = 0; i < 3; i++) {
      this.colorMap[s + i] = colors[i];
    }
  }

  getByte(byteIndex) {
    var chars = this.getByteChars(byteIndex);
    var byte = '';
    for (var i = 0; i < chars.length; i++) {
      byte += (chars[i] ? chars[i] : '0');
    }
    return byte;
  }


  getNumModifierColor(modifier) {
    var color = 'grey';
    switch (modifier) {
      case "@":
        color = 'lightblue'; break;
      case "*":
        color = 'red'; break;
      case "-":
        color = 'white'; break;
    }
    return color;
  }

  drawCharsLine(lineIdx) {
    var start = lineIdx * this.cellsInRow;
    for (var i = 0; i < this.cellsInRow; i++) {
      this.drawDataChar(start + i);
    }
  }

  loadFirstLevel() {
    this.level = 0;
    this.loadLevel();

    this.loadProgramm([
    'MOV@08@0C005',
    '',
    '001002003004'
    ])

    return;
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


var CurosorDir = {
  left: 0,
  up: 1,
  right: 2,
  down: 3
}





