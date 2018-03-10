
class Box256 {

  constructor(wrapper) {

    this.width = 800;
    this.height = 640;

    this.wrapper = wrapper;

    this.wrapper.style.width = this.width + 'px';
    this.wrapper.style.height = this.height + 'px';

    // Active area width
    this.cellsInRow = 12;

    // Amount of lines in editor
    this.linesCount = 32;

    this.activeSelection = [];

    // Where active area start
    this.cellsOffset = {x: 4, y: 3};
    this.memCellOffset = {x: 20, y: 3};

    this.maxCursorPos = this.cellsInRow * this.linesCount - 1;
    this.cursor = false; // display reversed or usual
    this.setCursor(0);

    this.charsArraySize = this.cellsInRow * this.linesCount;
    // Map of chars in editor and their colors
    this.chars = new Array(this.cellsInRow * this.linesCount);
    this.colorMap = new Array(this.cellsInRow * this.linesCount);

    this.bgColor = '#111';

    this.commandColors = {
      'MOV': 'green',
      'PIX': 'pink',
      'JMP': 'bordo',
      'JNE': 'orange',
      'JEQ': 'orange',
      'JGR': 'orange',
      'ADD': 'aqua',
      'SUB': 'aqua',
      'MUL': 'aqua',
      'DIV': 'aqua',
      'MOD': 'aqua',
      'THR': 'yellow',
      'FLP': 'green',
    }

    this.stepDelay = 20;

    setTimeout(() => {
      this.attachListeners()
    }, 500);

    this.screen = new ScreenRender();

    this.cmdManager = new CommandManager(this.screen);

    this.view = new ViewRender({
      wrapper: this.wrapper,
      height: this.height,
      width: this.width,
      cellSize: 16,
      lines: this.linesCount
    });

    this.view.onReady(() => {
      // Draw background default data
      this.view.drawTemplate();

      this.screen.layer = this.view.layers.data;

      this.init();
    });

    this.memoryBox = new BoxMemory(this.view, this.cmdManager);

    this.cmdManager.setMemory(this.memoryBox);

  }

  init() {
    this.runCursor(false);
    this.running = false;
  }

  run() {
    if (!this.running) {
      this.prepareToRun();
    }
    this.step(true);
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

    // Reset pixels screen
    this.screen.resetScreen();

    // Lets count cycles
    this.cycles = 0;

    this.createdThread = -1;
    this.threads = [0];

    this.running = true;

    this.drawActiveLines(this.threads);
  }

  step(async) {
    if (!this.running) {
      this.prepareToRun();
    } else {
      if (!async) {
        clearTimeout(this.stepTimeout);
      } else {
        this.stepTimeout = setTimeout(() => {
          this.step(true);
        }, this.stepDelay);
      }

      // Count cycles
      this.cycles++;

      // Deactivate current line
      this.drawUnactiveLines(this.threads);

      this.memoryBox.setReadLock();


      for (var thx = 0; thx < this.threads.length; thx++) {
        // Execute line command

        let next = this.runInstruction(this.threads[thx]);

        // If level ready
        if (next == -1) {
          this.onLevelCompleted();
          return;
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

    // Put memory back
    this.memoryBox.restoreMemory();

    // Run cursor
    this.runCursor(false);

    this.running = false;
  }

  runInstruction(line) {
    var idx = line * 4;
    var cmd = this.memoryBox.getByte(idx);
    var a = this.memoryBox.getByte(idx+1);
    var b = this.memoryBox.getByte(idx+2);
    var c = this.memoryBox.getByte(idx+3);

    var jumpTo = this.cmdManager.exec(cmd, [a,b,c]);

    if (jumpTo < 0) {
      var thread = -jumpTo;
      var tmp = thread % 4;
      if (tmp !== 0 ) {
        thread = (~~(thread/4)) + 1;
      } else {
        thread = thread/4;
      }

      // Created new thread from line
      this.createdThread = thread;

      // Continue current thread
      jumpTo = 0;
    }

    // After each PIX instruction check if
    // level goal is complete
    if (this.isLevelReady(cmd)) {
      return -1;
    }

    // COmand doesnt make jump go next line
    if (!jumpTo) {
      jumpTo = line + 1;
    } else {
      var tmp = jumpTo % 4;
      if (tmp !== 0 ) {
        jumpTo = (~~(jumpTo/4)) + 1;
      } else {
        jumpTo = jumpTo/4;
      }
    }

    return jumpTo;
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


  onLevelCompleted() {
    this.stop();
    console.log('Level completed. It takes', this.cycles, 'cycles');
  }

  isLevelReady(cmd) {
    var cmdNum = parseInt(cmd, 16);
    if (cmdNum > 32 && cmdNum < 42 ) {
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
    this.cursorInterval = setInterval(()=>{
      this.cursor = !this.cursor;
      this.drawCursor()
    }, 500);
  }


  drawCursor(value) {
    if (typeof value == 'undefined') {
      value = this.cursor;
    }

    var char = this.chars[this.cursorPos] || '0';
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
      this.drawActiveLine(line);
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
          this.drawActiveLine(line);
        } else {
          this.activeSelection.pop();
          this.moveCursor(dir);
          this.drawUnactiveLine(prevLine);
        }
      } else {
        // down
        if (this.activeSelection[this.activeSelection.length-1] == prevLine) {
          this.activeSelection.push(line);
          this.moveCursor(dir);
          this.drawActiveLine(line);
        } else {
          this.activeSelection.unshift();
          this.moveCursor(dir);
          this.drawUnactiveLine(nextLine);
        }
      }

    }
  }

  resetSelection() {
    this.drawUnactiveLines(this.activeSelection);
    this.activeSelection = [];
  }

  removeChar() {
    this.setChar(null);
    this.drawCursor(this.cursor);
  }

  removeCharBack() {
    if (this.cursorPos < 1) {
      return;
    }
    this.moveCursor(CurosorDir.left)
    this.setChar(null);
    this.drawCursor(this.cursor);

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

  insertNewLine(stayOnLine) {
    var line = ~~(this.cursorPos/this.cellsInRow);
    var nextLine = stayOnLine ? line : line + 1;

    if (nextLine >= this.linesCount) {
      return;
    }

    var pos = nextLine * this.cellsInRow;

    // Hide cursor before copy part of screen
    this.drawCursor(false);

    // PUsh new line chars
    var newLineArgs = new Array(this.cellsInRow).fill('0');
    newLineArgs.unshift(pos, 0);
    Array.prototype.splice.apply(this.chars, newLineArgs);
    // Trim array
    this.chars.splice(this.charsArraySize);

    // PUsh new line colors
    var newColorsArgs = new Array(this.cellsInRow).fill('grey');
    newColorsArgs.unshift(pos, 0);
    Array.prototype.splice.apply(this.colorMap, newColorsArgs);
    // Trim array
    this.colorMap.splice(this.charsArraySize);


    // Shift memory
    this.memoryBox.insertMemoryLine(nextLine);

    this.view.moveLines(this.getCellPosition(pos), this.linesCount - nextLine, 24, 1);


    // Draw new line
    this.drawUnactiveLine(nextLine)

    // Put cursor on new line
    this.moveCursorToPos(pos);

  }

  removeCurrentLine() {
    var line = ~~(this.cursorPos/this.cellsInRow);

    var pos = line * this.cellsInRow; // next row position

    // Hide cursor before copy part of screen
    this.drawCursor(false);


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
    this.view.moveLines(this.getCellPosition(nextLine * this.cellsInRow), this.linesCount - nextLine, 24, -1);


    // Draw new line at the end
    this.drawUnactiveLine(this.linesCount - 1)

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
          this.setChar(null);
          valid = true;
        }

        break;
      case "mem":
      case "ref":
      case "min":
        if (rowPos > 0 && rowPos % 3 == 0) {
          var color = type == 'ref' ? 'red':'lightblue';
          if (type == 'min') color = 'white';
          this.setChar(char, color);
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

  setChar(char, color) {
    var pos = this.cursorPos;
    this.putChar(pos, char, color)
    this.updateByte(~~(pos/3));
  }

  putChar(pos, char, color) {
    color = color || 'white';
    this.chars[pos] = char ? char : null;
    this.colorMap[pos] = char ? color : null;
  }


  drawDataChar(pos) {
    var cell = this.getCellPosition(pos);
    var char = this.chars[pos] || '0';
    var color = this.colorMap[pos] || 'grey';
    this.view.drawText(char, cell, color, this.bgColor);
  }

  drawActiveLines(threads) {
    threads.forEach(line => {
      this.drawActiveLine(line);
    });
  }

  drawActiveLine(line) {
    const start = line * this.cellsInRow;
    for (let i = 0; i < 12; i++) {
      const pos = start + i;
      const cell = this.getCellPosition(pos);
      const char = this.chars[pos] || '0';
      this.view.drawText(char, cell, 'black', '#fff');

      // Fill space between columns
      if (i > 0 && i % 3 == 0) {
        this.view.drawColor({x: cell.x - 1, y: cell.y}, '#fff');
      }
    }

    this.memoryBox.drawMemoryLine(line, false, true);

  }

  drawUnactiveLines(threads) {
    threads.forEach(line => {
      this.drawUnactiveLine(line);
    });
  }

  drawUnactiveLine(line) {
    const start = line * this.cellsInRow;
    for (let i = 0; i < 12; i++) {
      this.drawDataChar(start + i);

      // Fill space between columns
      if (i > 0 && i % 3 == 0) {
        const cell = this.getCellPosition(start + i);
        this.view.drawColor({x: cell.x - 1, y: cell.y}, this.bgColor);
      }
    }

    this.memoryBox.drawMemoryLine(line, false, false);
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


  setByteChars(byteIndex, word, color) {
    var s = byteIndex * 3;
    for (i=0; i < 3; i++) {
      var pos = s+i;
      if (word[i] !== ' ') {
        this.putChar(pos, word[i], color)
      } else {
        this.putChar(pos, null);
      }

      this.drawDataChar(pos);

    }
  }

  updateByte(byteIndex) {
    var ctrlCharPos = byteIndex * 3;
    var chars = this.getByteChars(byteIndex);
    var isZero = false;
    if (byteIndex % 4 != 0) {
      isZero = this.updateNumericsChars(byteIndex, chars);
    } else {
      // If command byte
      var word = ''
      var char;
      for (var i=0; char = chars[i], i<3; i++) {
          word += char ? char[0] : '0';
      }

      // If valid command exists
      if (this.commandColors[word]) {
        this.setByteChars(byteIndex, word, this.commandColors[word])
      } else {
        // If start from digit or empty- lets update values
        if ( /^[0-9A-F]{3}$/.test(word) ) {
          // Mark fist letter grey
          this.putChar(ctrlCharPos, word[0], 'grey');
          // Actieate numeric values
          isZero = this.updateNumericsChars(byteIndex, chars);

        } else {
          // Other wise disable all byte
          this.setByteChars(byteIndex, word, 'grey')
        }
      }
    }

    var line = this.getByteLineIndex(byteIndex);

    // Put correct opcodes to memory on according line
    this.memoryBox.updateMemoryLine(line, this.getLineBytes(line));

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


  updateNumericsChars(byteIndex, chars) {
    var ctrlCharPos = byteIndex * 3;
    // Check if all 3 chars are empty or queal ZERO
    var zeroChars = 0;
    for (var i = 0; i < 3; i++) {
      if(!chars[i] || chars[i][0] == '0') zeroChars++;
    }

    // Disable byte is all zeros
    if (zeroChars == 3) {
      this.setByteChars(byteIndex, '   ', 'grey');
    } else {
      // Activate numbers, and set it to zero
      for (var i = 1; i < 3; i++) {
        var char = chars[i];
        this.putChar(ctrlCharPos + i, char ? char[0] : '0');
        this.drawDataChar(ctrlCharPos + i);
      }
    }
  }


  attachListeners() {

    window.addEventListener('keydown',function(e) {


    }.bind(this))

    window.addEventListener('keydown',function(e) {
      const code = e.keyCode;


      // 17 67

      // 86

      if (this.activeSelection.length) {
        if (code != 16 && code != 16 && !(e.shiftKey && (code == 38 || code == 40))) {
          this.resetSelection();
        }
      }

      if (e.key == 'Tab') {
        e.preventDefault();
        return;
      } else if (e.keyCode == 46) {// delete
        this.onDelete();
        return;
      } else if (e.keyCode == 8) {// backspace
        this.removeCharBack();
        return;
      } else if (e.keyCode == 13) {// Enter
        this.insertNewLine(e.shiftKey);
        return;
      }


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
      this.loadLine(line, i);
    });
  }

  loadLine(line, lineIdx) {
    var pos = lineIdx * this.cellsInRow;
    var color;
    var types = [];
    var cmd = line[0] + line[1];
    var command = this.cmdManager.commandMap[cmd];
    if (command) {
      var cmdName = command.substr(0,3);
      types = command.substr(4).split('_');
      color = this.commandColors[cmdName];

      // Draw command
      for (var i = 0; i < 3; i++) {
        this.putChar(pos + i, cmdName[i], color);
        this.drawDataChar(pos + i);
      }
    } else {
      this.putChar(pos + 1, line[0], color);
      this.putChar(pos + 2, line[1], color);
      this.drawDataChar(pos + 1);
      this.drawDataChar(pos + 2);
    }


    var num, color, p;

    var diff = 2;
    var r = 0;
    for (var i = 2; i < 8; i += 2) {
      p = pos + diff;

      color = 'white';

      this.putChar(p + i, line[i], color);
      this.putChar(p + i +1, line[i+1], color);

      this.drawDataChar(p +i);
      this.drawDataChar(p +i +1);

      var type = types[r];
      if (type) {
        if (type == 'm') {
          this.putChar(p + i - 1, '@', 'lightblue');
          this.drawDataChar(p + i - 1);
        } else if (type == 'p') {
          this.putChar(p + i - 1, '*', 'red');
          this.drawDataChar(p + i - 1);
        }
      }

      diff++;
      r++;
    }

    this.memoryBox.updateMemoryLine(lineIdx, this.getLineBytes(lineIdx));
  }

  getCurrentLevel() {
    if (!this.currentLevel) {
      var l = '';
      l += '0000000000000000';
      l += '0000000000000000';
      l += '0011111111111100';
      l += '0010000000000100';
      l += '0010000000000100';
      l += '0010000000000100';
      l += '0010000000000100';
      l += '0010000000000100';
      l += '0010000000000100';
      l += '0010000000000100';
      l += '0010000000000100';
      l += '0010000000000100';
      l += '0010000000000100';
      l += '0011111111111100';
      l += '0000000000000000';
      l += '0000000000000000';
      this.currentLevel = l;
    }

    return this.currentLevel;
  }

}

var test = [
'01226000',
'01304000',
'24600100',
'37604060',
'31610161',
'420B6108',
'01006100',
'31400140',
'1108',

'00000000',
'00000000',
'00000000',

'0110FFF0',
]

var CurosorDir = {
  left: 0,
  up: 1,
  right: 2,
  down: 3
}





