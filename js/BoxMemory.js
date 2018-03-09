
class BoxMemory {

  constructor(viewRender, cmdManager) {
    // For redraw memory cells
    this.view = viewRender;

    // Commands validator
    this.cmdManager = cmdManager;

    // Memory block offset on screen (in basic cells)
    this.memCellOffset = {x: 20, y: 3};

    // 256 bytes memory
    this.memory = new Memory(256);

  }

  validateCommand(bytes) {
    return this.cmdManager.validate(bytes[0], bytes[1], bytes[2],bytes[3]);
  }

  getByte(index) {
    return this.memory.get(index);
  }

  setByte(index, byte) {
    this.memory.set(index, byte);
    this.drawMemoryByte(index, byte);
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

  updateMemoryLine(line, bytes) {
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
    let byte, color, bg;
    // Draw each memory byte
    for (let i = 0; i < 4; i++) {
      byte = this.memory.get(index + i);
      color = error ? 'red': (byte == '00' ? 'green' : 'lightgreen');
      if (invert) {
        color = 'black';
        bg = '#6ddd64';
      }
      this.drawMemoryByte(index + i, byte, color, bg);
    }
  }

  drawMemoryByte(index, value, color, bg) {
    color = color || 'lightgreen';
    var byteIndex = index % 4;
    var line = ~~(index / 4);
    this.view.drawText(value, {
      x: this.memCellOffset.x + byteIndex * 2,
      y: this.memCellOffset.y + line,
    }, color, bg);
  }

  reverseNumber(num) {
    var max = 256;
    var n = parseInt(num, 16);
    if(n == 0) return 0;
    var inv = (max - n).toString(16).toUpperCase();

    return inv;
  }

}