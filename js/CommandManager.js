
class CommandManager {

  constructor() {

    /*
      c, m, p - types of function arguments
      c_m -> contant to memory
      m_p -> memory to pointer
      c_p ->constant to pointer etc
    */
    this.commandList = {
      'MOV_c_m': '01',
      'MOV_m_m': '02',
      'MOV_p_m': '03',
      'MOV_c_p': '04',
      'MOV_m_p': '05',
      'MOV_p_p': '06',

      'JMP_c':'11',
      'JMP_m':'12',
      'JMP_p':'13',


      'PIX_c_c': '21',
      'PIX_c_m': '22',
      'PIX_c_p': '23',
      'PIX_m_c': '24',
      'PIX_m_m': '25',
      'PIX_m_p': '26',
      'PIX_p_c': '27',
      'PIX_p_m': '28',
      'PIX_p_p': '29',

      'ADD_m_c_c': '30',
      'ADD_m_c_m': '31',
      'ADD_m_c_p': '32',
      'ADD_m_m_c': '33',
      'ADD_m_m_m': '34',
      'ADD_m_m_p': '35',
      'ADD_m_p_c': '36',
      'ADD_m_p_m': '37',
      'ADD_m_p_p': '38',

      'ADD_p_c_c': '39',
      'ADD_p_c_m': '3A',
      'ADD_p_c_p': '3B',
      'ADD_p_m_c': '3C',
      'ADD_p_m_m': '3D',
      'ADD_p_m_p': '3E',
      'ADD_p_p_c': '3F',
      'ADD_p_p_m': '40',
      'ADD_p_p_p': '41',

      'JGR_c_m_c':'42',
      'JGR_m_c_c':'43'

    }

    this.commandMap = {};
    for (var name in this.commandList) {
      this.commandMap[this.commandList[name]] = name;
    }

  }

  setView(view) {
    this.view = view;
  }

  validate(cmd, A, B, C) {
    if (this['validate'+ cmd]) {
      return this['validate'+ cmd](A,B,C);
    }
    return false
  }

  isRef(byte) {
    if (byte[0] !== '@' && byte[0] !== '*') {
      return false;
    }
    return true;
  }

  validateADD(a,b,c) {
    if (! this.isRef(a)) {
       return false;
    }
    var cmd = 'ADD_' + this.getArgTypes(a,b,c);
    return this.commandList[cmd]
  }

  validateMOV(a,b) {
    if (! this.isRef(b)) {
       return false;
    }
    var cmd = 'MOV_' + this.getArgTypes(a,b);
    return this.commandList[cmd]
  }

  validatePIX(a,b) {
    var cmd = 'PIX_' + this.getArgTypes(a,b);
    return this.commandList[cmd]
  }

  validateJMP(a) {
    var cmd = 'JMP_' + this.getArgTypes(a);
    return this.commandList[cmd]
  }

  validateJGR(a,b,c) {
    var cmd = 'JGR_' + this.getArgTypes(a,b,c);
    return this.commandList[cmd]
  }

  getArgTypes() {
    var args = Array.prototype.slice.call(arguments);
    return args.map(arg => {
      if(arg[0] == '@') return 'm';
      if(arg[0] == '*') return 'p';
      return 'c';
    }).join('_');
  }


  exec(cmdEnum, args, memory) {
    var cmd = this.commandMap[cmdEnum];
    if (!cmd) {
      //Command not found, skip
      return -1;
    }

    var cmdName = cmd.substr(0,3);
    var argTypes = cmd.substr(4).split('_');

    switch (cmdName) {
      case "ADD":
        this.execADD(memory, args, argTypes);
        break;
      case "MOV":
        this.execMOV(memory, args, argTypes);
        break;
      case "JMP":
        return this.execJMP(memory, args, argTypes);
        break;
      case "JGR":
        return this.execJGR(memory, args, argTypes);
        break;
      case "PIX":
        return this.execPIX(memory, args, argTypes);
        break;
    }
  }

  execADD(memory, args, argTypes) {
    var a = this.getValue(memory, args[0], argTypes[0]);
    var b = this.getValue(memory, args[1], argTypes[1]);
    var c = this.getValue(memory, args[2], argTypes[2]);
    this.setValue(memory, b + c, args[0], argTypes[0]);
  }

  execMOV(memory, args, argTypes) {
    var a = this.getValue(memory, args[0], argTypes[0]);
    this.setValue(memory, a, args[1], argTypes[1]);
  }

  execJMP(memory, args, argTypes) {
    var jmpTo = this.getValue(memory, args[0], argTypes[0]);
    return jmpTo;
  }


  execJGR(memory, args, argTypes) {
    var a = this.getValue(memory, args[0], argTypes[0]);
    var b = this.getValue(memory, args[1], argTypes[1]);
    if (a > b) {
      var jmpTo = this.getValue(memory, args[2], argTypes[2]);
      return jmpTo;
    }
  }

  execPIX(memory, args, argTypes) {
    var a = this.getValue(memory, args[0], argTypes[0]);
    var b = this.getValue(memory, args[1], argTypes[1]);
    var y = ~~(a / 16);
    var x =a % 16;
    this.view.drawPixel(x,y, b);
  }

  getValue(memory, val, type) {
    switch (type) {
      case "c":
        return parseInt(val, 16);
        break;
      case "m":
        var adress = parseInt(val, 16);
        return parseInt(memory.get(adress), 16);
        break;
      case "p":
        var cell = parseInt(val, 16);
        var adress = parseInt(memory.get(cell), 16);
        return parseInt(memory.get(adress), 16);
        break;
    }
  }

  setValue(memory, val, dest, destType) {
    if (val > 255 ) {
      val = val % 256
    }
    val = this.toHex(val);
    switch (destType) {
      case "m":
        var adress = parseInt(dest, 16);
        memory.set(adress, val);
        break;
      case "p":
        var cell = parseInt(dest, 16)
        var adress = parseInt(memory.get(cell), 16);
        memory.set(adress, val);
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

