
class BoxMemory {

  constructor(view, offset) {
    // For redraw memory cells
    this.view = view;

    // Memory block offset on screen (in basic cells)
    this.offset = offset;

    this.hoverColor = 'grey';

    // 256 bytes memory
    this.memory = new Memory(256);

    this.readLock = false;

    this.lockedValues = {};

    this.linesCount = 32;

    this.lines = new Array(this.linesCount).fill(0)
    this.usedLines = 0;

    this.validLine = new Array(this.linesCount).fill(true);

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
    for (var i = 0; i < this.linesCount; i++) {
      this.drawMemoryLine(i);
    }
  }

  count() {
    return this.usedLines;
  }

  getLineBytes(line) {
    const index = line * 4;
    const bytes = [];
    for (let i = 0; i < 4; i++) {
      bytes.push(this.getByte(index + i));
    }
    return bytes;
  }

  updateUsedLines() {
    var count = 0;
    for (var i = 0; i < this.lines.length; i++) {
      count += this.lines[i];
    }
    this.usedLines = count;
  }

  updateMemoryLine(line, opcode, valid) {
    // Write command to memory
    for (var i = 0; i < 4; i++) {
      this.memory.set(line * 4 + i, opcode[i]);
    }
    this.validLine[line] = valid;
    this.drawMemoryLine(line);
  }

  drawMemoryLine(line, invert) {
    const error = !this.validLine[line];
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

  shiftLines(line, dir) {
    if (dir == 1) {
      this.insertMemoryLine(line);
    } else {
      this.deleteMemoryLine(line);
    }
    for (var i =0; i < this.linesCount;i++) {
      this.drawMemoryLine(i);
    }

  }

    // Insert new memory line
  insertMemoryLine(line, count) {
    var pos = line * 4;
    var newLineArgs = new Array(4).fill('00');
    newLineArgs.unshift(pos, 0);
    Array.prototype.splice.apply(this.memory._memory, newLineArgs);
    // Trim array
    this.memory._memory.splice(256);


    this.validLine.splice(line, 0, 0);
    this.validLine.pop();

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

    this.validLine.splice(line, 1);
    this.validLine.push(true);

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

    this.view.drawText('MEMORY', {
      x: this.offset.x + 1,
      y: this.offset.y - 2
    },'green');
  }
}

