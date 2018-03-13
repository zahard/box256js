
class ActionsBuffer {

  constructor(App) {
    this.app = App;
    this.actionsBuffer = [];
    this.bufferSize = 200;

    this.actionOffset = 0;
  }

  add (action) {
    if (this.actionOffset) {
      var actionPos = this.actionsBuffer.length - this.actionOffset;
      this.actionsBuffer = this.actionsBuffer.slice(0, actionPos);
      this.actionOffset = 0;
    }
    this.actionsBuffer.push(action);
    if (this.actionsBuffer.length > this.bufferSize) {
      this.actionsBuffer.shift();
    }
  }

  redo() {
    if (!this.actionOffset) return;
    this.actionOffset--;

    var actionPos = this.actionsBuffer.length - this.actionOffset - 1
    var last = this.actionsBuffer[actionPos];

    switch (last.type) {
      case 'char':
        this.app.setCharToPos(last.pos, last.newVal);
        break;
      case 'insertLine':
        this.app.insertNewLine(true, last.line, null, true);
        break;
      case 'deleteLine':
        this.app.removeCurrentLine(last.line, true);
        break;
       case 'paste':
        for (var i =0; i< last.newVal.length; i++) {
          this.app.putLineChars(last.newVal[i], last.line + i);
        }
        break;
    }

    this.app.moveCursorToPos(last.prevCur || last.cur);

  }

  undo() {
    if (!this.actionsBuffer.length) return;
    if (this.actionOffset >= this.actionsBuffer.length) return;

    var actionPos = this.actionsBuffer.length - this.actionOffset - 1
    var last = this.actionsBuffer[actionPos];

    switch (last.type) {
      case 'char':
        this.app.setCharToPos(last.pos, last.oldVal);
        break;
      case 'insertLine':
        this.app.removeCurrentLine(last.line, true);
        this.app.putLineChars(last.chars, this.app.linesCount - 1);
        break;
      case 'deleteLine':
        this.app.insertNewLine(true, last.line, last.chars.slice(), true);
        break;
      case 'paste':
        for (var i =0; i< last.oldVal.length; i++) {
          this.app.putLineChars(last.oldVal[i], last.line + i);
        }
        break;
    }

    this.app.moveCursorToPos(last.cur);
    this.actionOffset++;
  }


}
