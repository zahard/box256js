
class Box256 {

  constructor() {

    this.width = 800;
    this.height = 640;

    this.wrapper = $('wrapper');
    this.wrapper.style.width = this.width + 'px';
    this.wrapper.style.height = this.height + 'px';

    // Active area width
    this.cellsInRow = 12;

    // Amount of lines in editor
    this.linesCount = 32;

    // Where active area start
    this.cellsOffset = {x: 4, y: 3};
    this.memCellOffset = {x: 20, y: 3};

    this.maxCursorPos = this.cellsInRow * this.linesCount - 1;
    this.cursor = false; // display reversed or usual
    this.setCursor(0);

    // Map of chars in editor and their colors
    this.chars = new Array(this.cellsInRow * this.linesCount);
    this.colorMap = new Array(this.cellsInRow * this.linesCount);

    // Create memory
    this.memory = new Memory(this.cellsInRow * this.linesCount);

    this.commands = {
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
    }

    this.stepDelay = 50;

    /*
    this.colors = {
      white: 0,
      black: 1,
      blue: 2,
      lightblue: 3,
      grey:3,
      green: 4,
      lightgreen: 5,
      red: 6,
      orange: 7,
      pink: 8,
      bordo: 9,
      aqua: 10
    }*/

    setTimeout(() => {
      this.attachListeners()
    }, 500);

    this.cmdManager = new CommandManager();

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
      this.init();
    });

    this.cmdManager.setView(this.view);

  }

  init() {
    this.runCursor(false);

    this.running = false;
  }

  run() {
    this.resetCursorInterval();
    this.runCode(0);
    this.running = true;
  }


  step() {
    if (!this.running) {
      this.resetCursorInterval();
      this.running = true;
      this.currentStep = 0;
      this.drawActiveLine(this.currentStep);
    } else {
      let next = this.runInstruction(this.currentStep);
      const prev = this.currentStep;

      next = next != -1 ? next : prev + 1;

      if (next < this.linesCount) {
        this.currentStep = next
        this.drawActiveLine(this.currentStep);
        this.drawUnactiveLine(prev);
      } else {
        this.stop();
      }

    }

  }

  stop() {
    var prev = this.currentStep;
    this.currentStep = -1;

    this.drawUnactiveLine(prev);

    this.running = false;
    this.runCursor(false);
  }

  runCode(line) {

    if (line < this.linesCount) {
      this.currentStep = line;

      this.drawActiveLine(line);

      const next = this.runInstruction(line);
      if (next == -1) {
        // Prev instruction was not found
        this.currentStep = line + 1;
        this.drawUnactiveLine(line);
        this.runCode(line + 1);
      } else {
        // If instuction was found make a delay
        setTimeout(() => {
          if (!this.running) {
            return;
          }
          this.currentStep = next;
          this.drawUnactiveLine(line);
          this.runCode(next);
        }, this.stepDelay)
      }
    } else {
      console.log('Finsih')
      this.stop();
    }
  }

  runInstruction(line) {
    var idx = line * 4;
    var cmd = this.memory.get(idx);

    // Empty command - skip to next line
    if (cmd == '00') {
      return -1;
    }

    var a = this.memory.get(idx+1);
    var b = this.memory.get(idx+2);
    var c = this.memory.get(idx+3);

    var jumpTo = this.execCommand(cmd, a, b, c);
    // Not found cmd
    if (jumpTo == -1) {
      return -1;
    }

    if(!jumpTo) {
      jumpTo = line +1;
    } else {
      var tmp = jumpTo % 4;
      if (tmp !== 0 ) {
        jumpTo = (~~(jumpTo/4)) + 1;
      } else {
        jumpTo = jumpTo/4;
      }
    }

    var lines = this.memory.flushChangedLines();
    lines.forEach(ln => {
      this.drawMemoryLine(ln, false)
    });

    return jumpTo;
  }

  execCommand(cmd, a,b,c) {
    var memory = this.memory;
    return this.cmdManager.exec(cmd, [a,b,c], memory);
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
      this.view.drawText(char, this.activeCell, color, '#222');
    }
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
    this.view.drawText(char, cell, color, '#222');
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

    this.drawMemoryLine(line, false, true);

  }

  drawUnactiveLine(line) {
    const start = line * this.cellsInRow;
    for (let i = 0; i < 12; i++) {
      this.drawDataChar(start + i);

      // Fill space between columns
      if (i > 0 && i % 3 == 0) {
        const cell = this.getCellPosition(start + i);
        this.view.drawColor({x: cell.x - 1, y: cell.y}, '#222');
      }
    }

    this.drawMemoryLine(line, false);
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

  setByteChars(byteIndex, word, color) {
    var s = byteIndex * 3;
    for (i=0; i < 3; i++) {
      var pos = s+i;
      if (word[i] !== ' ') {
        this.putChar(pos, word[i], color)
      } else {
        this.putChar(pos, null);
      }
      //if (pos != this.cursorPos) {
        this.drawDataChar(pos);
      //}
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
      if (this.commands[word]) {
        this.setByteChars(byteIndex, word, this.commands[word])
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

    this.updateMemory(byteIndex);

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

  getSlotText(index) {
    var s = index * 3;
    var chars = this.chars.slice(s, s+3);
    var word = '';
    for (var i = 0; i < 3; i++) {
      word += chars[i] ? chars[i] : '0';
    }
    return word;
  }

  updateMemory(byteIndex) {
    var line = ~~(byteIndex / 4);
    var cmdByteIdx = line * 4;
    var cmdNum = '00';
    var error = true;

    // First check COMMAND byte
    var cmd = this.getSlotText(cmdByteIdx);

    // If command exists - validate it
    if (this.commands[cmd]) {
      let res = this.validateCommand(cmd, cmdByteIdx);
      if (res) {
        cmdNum = res;
        error = false;
      }
    } else if ( /^.+[0-9A-F]{2}$/.test(cmd) ) {
        // If valid number inserted
        cmdNum = cmd.substr(1); // take last 2 chars
        error = false;
    }

    // Write command to memory
    this.memory.set(line * 4, cmdNum);

    // Write arguments to memory
    let argIndex = cmdByteIdx + 1;
    for (let i = 1; i < 4; i++) {
      let byteCode = this.getSlotText(argIndex);
      let argVal = byteCode.substr(1);
      if (byteCode[0] == '-') {
        //reverse value
        argVal = this.reverseNumber(argVal);
      }
      this.memory.set((line*4) + i, argVal);
      argIndex++;
    }

    this.drawMemoryLine(line, error);
  }

  drawMemoryLine(line, error, invert) {
    const index = line * 4;
    let value, color, bg;
    for (let i=0; i < 4; i++) {
      value = this.memory.get(index+i);
      color = error ? 'red': (value == '00' ? 'green' : 'lightgreen');

      if (line == this.currentStep || invert) {
        color = 'black';
        bg = '#6ddd64';
      }
      this.view.drawText(value, {
          x: this.memCellOffset.x + i * 2,
          y: this.memCellOffset.y + line,
        }, color, bg);
    }
  }

  validateCommand(cmd, idx) {
    return this.cmdManager.validate(cmd,
      this.getSlotText(idx + 1),
      this.getSlotText(idx + 2),
      this.getSlotText(idx + 3)
    );
  }

  reverseNumber(num) {
    var max = 256;
    var n = parseInt(num, 16);
    var inv = (max - n).toString(16).toUpperCase();

    return inv;
  }


  attachListeners() {

    window.addEventListener('keydown',function(e) {
      if(e.key == 'Tab') {
        e.preventDefault();
        return;
      }

      if (e.keyCode == 46) {// delete
        this.removeChar();
        return;
      } else if (e.keyCode == 8) {// backspace
        this.removeCharBack();
        return;
      }

    }.bind(this))

    window.addEventListener('keydown',function(e) {
      const code = e.keyCode;

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
      } else if (code > 36 && code <  41) {
        this.moveCursor(code - 37);
      }
    }.bind(this));
  }

  moveCursor(dir) {
    var pos = this.cursorPos;
    var next = pos;

    //Check if we can move
    switch(dir) {
      case CurosorDir.left:
        if (pos > 0) next--;
        break;
      case CurosorDir.right:
        if (pos < this.maxCursorPos) next++;
        break;
      case CurosorDir.up:
        next = pos - this.cellsInRow;
        if (next < 0) next = pos;
        break;
      case CurosorDir.down:
        next = pos + this.cellsInRow;
        if (next > this.maxCursorPos) next = pos;
        break;
    }

    if (next != this.cursorPos) {
      this.resetCursorInterval();
      // Draw previous value as is
      this.drawCursor(false);

      this.setCursor(next);
      this.runCursor(true);
    }

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
      color = this.commands[cmdName];

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

    this.updateMemory(~~(pos/3));
  }

  loadCode(code) {
    const lines = code.split("\n");
    lines.forEach((l,i) => this.loadCodeLine(l,i));
  }

  loadCodeLine(line, lineNum) {
    if (line.length < 3) return;
    let pos = lineNum * this.cellsInRow;
    let p;
    for (let i = 0; i < 12; i++) {
      p = pos + i;
      let char = line[i] || null;
      this.putChar(p, char);
      this.drawDataChar(p);
    }
    this.updateMemory(~~(pos/3));
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





