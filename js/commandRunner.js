
class CommandRunner {

  constructor(screen, memory) {
    this.screen = screen;
    this.memory = memory;
    this.commandList = new CommandList();
  }

  exec(instruction) {
    var cmdCode = instruction[0];
    var args = instruction.slice(1);

    var cmd = this.commandList.getCommandByCode(cmdCode);
    if (!cmd) {
      //Command not found, skip
      return;
    }

    var cmdName = cmd.substr(0,3);
    var argTypes = cmd.substr(4).split('_');

    var info = this.commandList.getCommand(cmdName);

    var values = [];

    for (var i=0;i<info.args.length;i++) {
      if (info.args[i] == 'w') {
        // Value should be memory adress
        values.push(this.getAddress(args[i], argTypes[i]));
      } else {
        // Read value
        values.push(this.getValue(args[i], argTypes[i]));
      }
    }

    if (this['exec'+ cmdName]) {
      return this['exec'+ cmdName].apply(this, [args, argTypes].concat(values));
    }
  }

  execMOV(args, argTypes, a, b, c) {
    var count = c || 1;
    // Repeat constant values
    if (argTypes[0] == 'c') {
      for (var i = 0; i < count; i++) {
        this.setAdressValue(a, b + i);
      }
    } else {
      var srcAddress = this.getAddress(args[0], argTypes[0]);
      for (var i=0; i<count;i++) {
        this.setAdressValue(this.getAdressValue(srcAddress + i), b + i);
      }
    }
  }

  execFLP(args, argTypes, a, b, c) {
    var count = c || 1;

    var av = this.getAdressValue(a);
    var bv = this.getAdressValue(b);
    this.setAdressValue(av, b);
    this.setAdressValue(bv, a);
  }


  execJMP(args, argTypes) {
    return this.jumpTo(args[0], argTypes[0]);
  }

  execJGR(args, argTypes, a, b) {
    if (a > b) {
      return this.jumpTo(args[2], argTypes[2]);
    }
  }

  execJEQ(args, argTypes, a, b) {
    if (a === b) {
      return this.jumpTo(args[2], argTypes[2]);
    }
  }

  execJNE(args, argTypes, a, b) {
    if (a !== b) {
      return this.jumpTo(args[2], argTypes[2]);
    }
  }

  jumpTo(num, type) {
    // If constant value return offset
    if (type == 'c') {
      var lines = Math.ceil(parseInt(num, 16) / 4);
      return {
        jumpOffset: lines
      }
    } else {
      if (type == 'm') type = 'c';
      if (type == 'p') type = 'm';
      return {
        jumpTo: this.getValue(num, type)
      }
    }
  }

  execPIX(args, argTypes, a, b) {
    var y = ~~(a / 16);
    var x = a % 16;
    var color = b % 16;
    this.screen.drawPixel(x,y, color);
  }


  execTHR(args, argTypes, a) {
    return {
      createdThread: a
    };
  }

  execADD(args, argTypes, a, b, c) {
    this.setAdressValue(a + b, c);
  }

  execSUB(args, argTypes, a, b, c) {
    this.setAdressValue(a - b, c);
  }

  execMUL(args, argTypes, a, b, c) {
    this.setAdressValue(a * b, c);
  }

  execDIV(args, argTypes, a, b, c) {
    this.setAdressValue(parseInt(a / b, 10),  c);
  }

  execMOD(args, argTypes, a, b, c) {
    this.setAdressValue(parseInt(a % b, 10), c);
  }


  getValue(val, type) {
    var byte;
    switch (type) {
      case "c":
        byte = val;
        break;
      case "m":
        var adress = parseInt(val, 16);
        byte = this.memory.getByte(adress);
        break;
      case "p":
        var ref = parseInt(val, 16);
        var adress = parseInt(this.memory.getByte(ref), 16);
        byte = this.memory.getByte(adress);
        break;
    }

    return parseInt(byte, 16);
  }

  getAddress(val, type) {
    var adress;
    switch (type) {
      case "m":
        adress = parseInt(val, 16);
        break;
      case "p":
        var ref = parseInt(val, 16);
        adress = parseInt(this.memory.getByte(ref), 16);
        break;
    }

    return adress;
  }

  setValue(val, dest, destType) {
    if (val > 255 ) {
      val = val % 256;
    } else if (val < 0) {
      val = 256 + (val % 256);
    }

    val = this.toHex(val);
    switch (destType) {
      case "m":
        var adress = parseInt(dest, 16);
        this.memory.setByte(adress, val)
        break;
      case "p":
        var ref = parseInt(dest, 16)
        var adress = parseInt(this.memory.getByte(ref), 16);
        this.memory.setByte(adress, val);
        break;
    }
  }

  setAdressValue(val, address) {
    if (val > 255 ) {
      val = val % 256;
    } else if (val < 0) {
      val = 256 + (val % 256);
    }
    val = this.toHex(val);
    this.memory.setByte(address, val)
  }

  getAdressValue(adress) {
    var byte = this.memory.getByte(adress);
    return parseInt(byte, 16);
  }


  toHex(val) {
    val = val.toString(16).toUpperCase();
    if (val.length == 1) {
      val = '0' + val;
    }
    return val;
  }

}

