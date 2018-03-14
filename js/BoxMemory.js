
class BoxMemory {

  constructor(viewRender, cmdManager) {
    // For redraw memory cells
    this.view = viewRender;

    this.hoverColor = 'grey';

    // Commands validator
    this.cmdManager = cmdManager;

    // Memory block offset on screen (in basic cells)
    this.offset = {x: 20, y: 3};

    // 256 bytes memory
    this.memory = new Memory(256);

    this.readLock = false;

    this.lockedValues = {};

    this.linesCount = 32;

    this.lines = new Array(this.linesCount).fill(0)
    this.usedLines = 0;

  }

  validateCommand(bytes) {
    return this.cmdManager.validate(bytes[0], bytes[1], bytes[2],bytes[3]);
  }

  getByte(index) {
    if (this.readLock && this.lockedValues[index]) {
      return this.lockedValues[index];
    }
    return this.memory.get(index);
  }

  setByte(index, byte) {
    if (this.readLock && !this.lockedValues[index]) {
      // Save untouched value for assesing with another threads
      // save it only first time since after this value changed
      this.lockedValues[index] = this.memory.get(index);
    }

    this.memory.set(index, byte);

    this.drawMemoryByte(index, byte);
  }

  setReadLock() {
    this.readLock = true;
  }

  releaseReadLock() {
    this.lockedValues = {};
    this.readLock = false;
  }

  freezeMemory() {
    this._freezedMemory = this.memory.getCopy();
  }

  restoreMemory() {
    if (!this._freezedMemory) return;
    this.memory.reset(this._freezedMemory);
    this._freezedMemory = null;

    // Draw all lines
    //var linesCount = this.memory.len / 4;
    var linesCount = 32;
    for (var i = 0; i < linesCount; i++) {
      this.drawMemoryLine(i);
    }
  }

  count() {
    return this.usedLines;
  }

  updateUsedLines() {
    var count = 0;
    for (var i = 0; i < this.lines.length; i++) {
      count += this.lines[i];
    }
    this.usedLines = count;
  }

  updateMemoryLine(line, chars) {
    var bytes = chars.match(/.{3}/g);

    // First check COMMAND byte
    var cmd = bytes[0];
    // Default error state
    var cmdNum = '00';
    var error = true;

    // If command exists - validate it
    if (this.cmdManager.commandExists(cmd)) {
      let res = this.validateCommand(bytes);
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
    for (let i = 1; i < 4; i++) {
      let argVal = bytes[i].substr(1);
      if (bytes[i][0] == '-') {
        //reverse value
        argVal = this.reverseNumber(argVal);
      }
      this.memory.set((line * 4) + i, argVal);
    }

    this.drawMemoryLine(line, error);
  }

  drawMemoryLine(line, error, invert) {
    const index = line * 4;
    let bg;
    let forceColor;
    if (error) {
      forceColor = 'red';
    }
    if (invert) {
      forceColor = 'black';
      bg = '#6ddd64';
    }

    const bytes = [];
    for (let i = 0; i < 4; i++) {
      bytes.push(this.memory.get(index + i));
    }

    let colors = [];
    if (!forceColor) {
      let firstSet = bytes[0] != '00';
      colors = new Array('lightgreen');
      for (let i = 3; i >= 0; i--) {
        if (bytes[i] == '00') {
          colors[i] = 'green';
        } else if (firstSet) {
            break;
        }
      }
    }

    // Draw each memory byte
    for (let i = 0; i < 4; i++) {
      let color = forceColor ? forceColor : colors[i];
      this.drawMemoryByte(index + i, bytes[i], color, bg);
    }

    const used = bytes.join('') === '00000000' ? 0 : 1;
    var v = this.lines[line];
    if (this.lines !== used) {
      this.lines[line] = used;
      this.updateUsedLines();
    }
  }

  restoreHovered() {
    this.view.restoreArea(this.hoveredArea);
  }

  drawMemoryIndex(index) {
    let val = index.toString(16).toUpperCase();
    if (val.length == 1) val = '0' + val;

    var area = {
      x: this.offset.x + (index % 4) * 2,
      y: this.offset.y + (~~(index / 4)),
      w: 2,
      h: 1
    };
    this.hoveredArea = this.view.saveArea(area);

    this.drawMemoryByte(index, val, this.hoverColor);
  }

  drawMemoryByte(index, value, color, bg) {
    color = color || 'lightgreen';
    var byteIndex = index % 4;
    var line = ~~(index / 4);
    this.view.drawText(value, {
      x: this.offset.x + byteIndex * 2,
      y: this.offset.y + line,
    }, color, bg);
  }

  reverseNumber(num) {
    var max = 256;
    var n = parseInt(num, 16);
    if(n == 0) return 0;
    var inv = (max - n).toString(16).toUpperCase();

    return inv;
  }

  // Insert new memory line
  insertMemoryLine(line, count) {
    var pos = line * 4;
    var newLineArgs = new Array(4).fill('00');
    newLineArgs.unshift(pos, 0);
    Array.prototype.splice.apply(this.memory._memory, newLineArgs);
    // Trim array
    this.memory._memory.splice(256);

    this.lines.splice(line, 0, 0);
    this.lines.pop();
    this.updateUsedLines();
  }

  deleteMemoryLine(line) {
    var pos = line * 4;
    this.memory._memory.splice(pos, 4);
    // PUsh new line chars
    var newLine = new Array(4).fill('00');
    Array.prototype.push.apply(this.memory._memory, newLine);

    this.lines.splice(line, 1);
    this.lines.push(0);
    this.updateUsedLines();
  }

  /**
   * Draw template
   */
  draw() {
    const memory = [];
    for (var i = 0; i < this.linesCount; i++) {
      memory.push('00000000')
    }
    this.view.drawText(memory.join("\n"), this.offset, 'green');
  }
}
