
class BoxMemory {

  constructor(viewRener) {
    // For redraw memory cells
    this.view = viewRener;

    // Memory block offset on screen (in basic cells)
    this.memCellOffset = {x: 20, y: 3};

    // 256 bytes memory
    this.memory = new Memory(256);

  }

  updateMemory(line, chars) {

    // pass chars as CMD, ARGS[0,1,2]
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

}
