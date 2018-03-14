
// Singleton with command informations
function CommandList() {

    this.commandsInfo = {
      'MOV': {
        color: 'green',
        required: 2,
        args: ''
      },
      'PIX': {
        color: 'pink',
        required: 2,
        args: ''
      },
      'JMP': {
        color: 'bordo',
        required: 1,
        args: ''
      },
      'JNE': {
        color: 'brick',
        required: 3,
        args: ''
      },
      'JEQ': {
        color: 'brick',
        required: 3,
        args: ''
      },
      'JGR': {
        color: 'brick',
        required: 3,
        args: ''
      },
      'ADD': {
        color: 'purple',
        required: 3,
        args: ''
      },
      'SUB': {
        color: 'purple',
        required: 3,
        args: ''
      },
      'MUL': {
        color: 'purple',
        required: 3,
        args: ''
      },
      'DIV': {
        color: 'purple',
        required: 3,
        args: ''
      },
      'MOD': {
        color: 'purple',
        required: 3,
        args: ''
      },
      'THR': {
        color: 'yellow',
        required: 1,
        args: ''
      },
      'FLP': {
        color: 'green',
        required: 2,
        args: ''
      },
    };

    const instance = this;
    CommandList = () => instance;
}

CommandList.prototype.getCommand = function(cmdName) {
  if (this.commandsInfo[cmdName]) {
    return this.commandsInfo[cmdName];
  }
  return null;
}
