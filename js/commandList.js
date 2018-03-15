
// Singleton with command informations
function CommandList() {

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
    ];

    // r - readable (any), w - writable (ref to memory)
    this.commandsInfo = {
      'MOV': {
        color: 'green',
        required: 2,
        args: 'rwr',
        commutative: false
      },
      'PIX': {
        color: 'pink',
        required: 2,
        args: 'rr',
        commutative: false
      },
      'JMP': {
        color: 'bordo',
        required: 1,
        args: 'r',
        commutative: false
      },
      'JNE': {
        color: 'brick',
        required: 3,
        args: 'rrr',
        commutative: true
      },
      'JEQ': {
        color: 'brick',
        required: 3,
        args: 'rrr',
        commutative: true
      },
      'JGR': {
        color: 'brick',
        required: 3,
        args: 'rrr',
        commutative: false
      },
      'ADD': {
        color: 'purple',
        required: 3,
        args: 'rrw',
        commutative: true
      },
      'SUB': {
        color: 'purple',
        required: 3,
        args: 'rrw',
        commutative: false
      },
      'MUL': {
        color: 'purple',
        required: 3,
        args: 'rrw',
        commutative: true
      },
      'DIV': {
        color: 'purple',
        required: 3,
        args: 'rrw',
        commutative: false
      },
      'MOD': {
        color: 'purple',
        required: 3,
        args: 'rrw',
        commutative: false
      },
      'THR': {
        color: 'yellow',
        required: 1,
        args: 'w',
        commutative: false
      },
      'FLP': {
        color: 'green',
        required: 2,
        args: 'wwr',
        commutative: false
      },
    };

    this.generateOpCodes();

    const instance = this;
    CommandList = function() {
      return instance;
    }
}

CommandList.prototype.getOpcode = function(compiledCmd) {
  return this.opCodes[compiledCmd];
}

CommandList.prototype.getCommand = function(cmdName) {
  if (this.commandsInfo[cmdName]) {
    return this.commandsInfo[cmdName];
  }
  return null;
}

CommandList.prototype.commandExists = function(cmd) {
  return (typeof this.commandsInfo[cmd] !== 'undefined');
}

CommandList.prototype.getCommandByCode = function(cmdCode) {
  return this.commandMap[cmdCode];
}

CommandList.prototype.getCommandName = function(cmdCode) {
  var cmd = this.commandMap[cmdCode];
  if (!cmd) {
    return '';
  }
  return cmd.substr(0,3);
}


CommandList.prototype.generateOpCodes = function() {
  var opCodes = {};
  var args;
  var commandCode = 0;
  for (var cId = 0; cId < this.commandsSorted.length; cId++) {
    var cmd = this.commandsSorted[cId];
    args = this.getCommand(cmd).args;

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

CommandList.prototype.appendArgType = function(types, readType) {
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

CommandList.prototype.toHex = function(val) {
  val = val.toString(16).toUpperCase();
  if (val.length == 1) {
    val = '0' + val;
  }
  return val;
}

