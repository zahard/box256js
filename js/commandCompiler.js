
class CommandCompiler {

  constructor() {
    this.commandList = new CommandList();
  }

  compile(chars) {
    // Split char string into array of bytes
    var bytes = chars.match(/.{3}/g);

    // First check COMMAND byte
    var cmd = bytes[0];
    // Default error state
    var cmdNum = '00';
    var error = true;

    // If command exists - validate it
    const command = this.commandList.getCommand(cmd);
    if (command) {

      // If command has default params
      const argsLen = command.args.length;
      if (argsLen > command.required) {
        const notReqIndex = command.required + 1;
        for (let i = command.required +1; i <= argsLen; i++) {
          // If value empty apply default
          if (bytes[i] === '000') {
            bytes[i] = command.defaults[i - notReqIndex];
          }
        }
      }

      let res = this.validate(command,
        bytes[0], bytes[1], bytes[2],bytes[3]);
      if (res) {
        cmdNum = res;
        error = false;
      }
    } else if ( /^.+[0-9A-F]{2}$/.test(cmd) ) {
      // If valid number inserted
      cmdNum = cmd.substr(1); // take last 2 chars
      error = false;
    }

    const opcode = [cmdNum];

    // Write arguments to memory
    for (let i = 1; i < 4; i++) {
      let argVal = bytes[i].substr(1);
      if (bytes[i][0] == '-') {
        //reverse value
        argVal = this.reverseNumber(argVal);
      }
      opcode.push(argVal);
    }

    return {
      opcode: opcode,
      valid: !error
    }

  }

  validate(command, cmdName, a, b, c) {
    var argsTypes = command.args;
    var args = [a, b, c].slice(0, argsTypes.length);

    for (var i = 0; i < args.length;i++) {
      // Check if writable value passed
      if (argsTypes[i] == 'w' && !this.isRef(args[i])) {
        return false;
      }
    }

    var command = cmdName + '_' + this.getArgTypes(args);

    return this.commandList.getOpcode(command);
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

  reverseNumber(num) {
    var max = 256;
    var n = parseInt(num, 16);
    if(n == 0) return 0;
    var inv = (max - n).toString(16).toUpperCase();

    return inv;
  }

}
