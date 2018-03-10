
class CommandManager {

  constructor(screen) {

    this.screen = screen;

    // r - readable, w - writable (ref only)
    this.commands = {
      'MOV': 'rw',
      'PIX': 'rr',
      'JMP': 'r',
      'JNE': 'rrr',
      'JEQ': 'rrr',
      'JGR': 'rrr',
      'ADD': 'rrw',
      'SUB': 'rrw',
      'MUL': 'rrw',
      'DIV': 'rrw',
      'MOD': 'rrw',
      'THR': 'r',
      'FLP': 'ww'
    };

    this.commandsSorted = [
      'MOV',
      'ADD',
      'SUB',
      'JEQ',
      'MUL',
      'DIV',
      'JMP',
      'JGR',
      'PIX',
      'FLP',
      'THR',
      'MOD',
      'JNE',
    ]

    this.isCommutative = {
      'MOV': false,
      'PIX': false,
      'JMP': false,
      'JNE': true,
      'JEQ': true,
      'JGR': false,
      'ADD': true,
      'SUB': false,
      'MUL': true,
      'DIV': false,
      'MOD': false,
    }

    this.generateOpCodes();
  }

  generateOpCodes() {
    var opCodes = {};
    var args;
    var commandCode = 0;
    for (var cId = 0; cId < this.commandsSorted.length; cId++) {
      var cmd = this.commandsSorted[cId];
      args = this.commands[cmd];

      var types = [];
      for (var i = 0; i< args.length; i++) {
        this.appendArgType(types, args[i]);
      }

      for (var i = 0; i < types.length; i++) {
        commandCode++;
        opCodes[cmd+types[i]] = this.toHex(commandCode);
      }
    }

    this.opCodes = opCodes;

    this.commandMap = {};
    for (var name in this.opCodes) {
      this.commandMap[this.opCodes[name]] = name;
    }
  }

  appendArgType(types, readType) {
    //  c - contant to memory
    //  m - memory
    //  c -pointer to memory

    var modifiers = readType == 'r'
      ? ['_c', '_m', '_p']
      : ['_m', '_p'];
    var mLen = modifiers.length;

    if (!types.length) {
      Array.prototype.push.apply(types, modifiers.slice());
      return;
    }

    var newValues = [];
    for (var i = 0; i < mLen - 1; i++) {
      newValues = newValues.concat(types);
    }

    Array.prototype.push.apply(types, newValues);

    var limit = types.length / mLen;
    for (var t = 0; t < mLen; t++) {
      for (var i = limit * t; i < limit * (t+1); i++) {
        types[i] += modifiers[t];
      }
    }
  }

  commandExists(cmd) {
    return (typeof this.commands[cmd] !== 'undefined');
  }

  setMemory(memory) {
    this.memory = memory;
  }

  validate(cmd, a, b, c) {
    var argsTypes = this.commands[cmd];
    var args = [a, b, c].slice(0, argsTypes.length);

    for (var i=0; i<args.length;i++) {
      // CHeck if writable value passed
      if (argsTypes[i] == 'w' && !this.isRef(args[i])) {
        return false;
      }
    }

    var command = cmd + '_' + this.getArgTypes(args);
    return this.opCodes[command];
  }

  isRef(byte) {
    if (byte[0] !== '@' && byte[0] !== '*') {
      return false;
    }
    return true;
  }

  getArgTypes(args) {
    return args.map(arg => {
      if(arg[0] == '@') return 'm';
      if(arg[0] == '*') return 'p';
      return 'c';
    }).join('_');
  }


  exec(cmdEnum, args) {
    var cmd = this.commandMap[cmdEnum];
    if (!cmd) {
      //Command not found, skip
      return;
    }

    var cmdName = cmd.substr(0,3);
    var argTypes = cmd.substr(4).split('_');

    if (this['exec'+ cmdName]) {
      return this['exec'+ cmdName].call(this, args, argTypes);
    }
  }

  execMOV(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    this.setValue(a, args[1], argTypes[1]);
  }

  execFLP(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    var b = this.getValue(args[1], argTypes[1]);
    this.setValue(a, args[1], argTypes[1]);
    this.setValue(b, args[0], argTypes[0]);
  }

  execPIX(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    var b = this.getValue(args[1], argTypes[1]);
    var y = ~~(a / 16);
    var x = a % 16;

    this.screen.drawPixel(x,y, b);
  }

  execJMP(args, argTypes) {
    var jmpTo = this.getValue(args[0], argTypes[0]);
    return jmpTo;
  }

  execTHR(args, argTypes) {
    var jmpTo = this.getValue(args[0], argTypes[0]);
    return -jmpTo;
  }

  execJGR(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    var b = this.getValue(args[1], argTypes[1]);
    if (a > b) {
      var jumpTo = this.getValue(args[2], argTypes[2]);
      return jumpTo;
    }
  }

  execJEQ(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    var b = this.getValue(args[1], argTypes[1]);
    if (a === b) {
      var jumpTo = this.getValue(args[2], argTypes[2]);
      return jumpTo;
    }
  }

  execJNE(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    var b = this.getValue(args[1], argTypes[1]);
    if (a !== b) {
      var jumpTo = this.getValue(args[2], argTypes[2]);
      return jumpTo;
    }
  }

  execADD(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    var b = this.getValue(args[1], argTypes[1]);
    this.setValue(a + b, args[2], argTypes[2]);
  }

  execSUB(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    var b = this.getValue(args[1], argTypes[1]);
    this.setValue(a - b, args[2], argTypes[2]);
  }

  execMUL(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    var b = this.getValue(args[1], argTypes[1]);
    this.setValue(a * b, args[2], argTypes[2]);
  }

  execDIV(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    var b = this.getValue(args[1], argTypes[1]);
    this.setValue(parseInt(a / b, 10), args[2], argTypes[2]);
  }

  execMOD(args, argTypes) {
    var a = this.getValue(args[0], argTypes[0]);
    var b = this.getValue(args[1], argTypes[1]);
    this.setValue(parseInt(a % b, 10), args[2], argTypes[2]);
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

  toHex(val) {
    val = val.toString(16).toUpperCase();
    if (val.length == 1) {
      val = '0' + val;
    }
    return val;
  }

}

