
class ActionsBuffer {

  constructor(editor) {
    this.editor = editor;

    this.actionsBuffer = [];
    this.bufferSize = 200;
    this.actionOffset = 0;
  }

  add(action) {
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
        this.editor.setChar(last.newVal, last.pos);
        this.editor.updateCharLine(last.pos);
        break;
      case 'insertLine':
        this.editor.insertLine(true, last.line, null, true);
        break;
      case 'deleteLine':
        this.editor.deleteLine(last.line, true);
        break;
      case 'paste':
        for (var i = 0; i< last.newVal.length; i++) {
          this.editor.setLineChars(last.line + i, last.newVal[i]);
        }
        break;
    }

    this.editor.moveCursorToPos(last.prevCur || last.cur);

  }

  undo() {
    if (!this.actionsBuffer.length) return;
    if (this.actionOffset >= this.actionsBuffer.length) return;

    var actionPos = this.actionsBuffer.length - this.actionOffset - 1
    var last = this.actionsBuffer[actionPos];

    switch (last.type) {
      case 'char':
        this.editor.setChar(last.oldVal, last.pos);
        this.editor.updateCharLine(last.pos);
        break;
      case 'insertLine':
        this.editor.deleteLine(last.line, true);
        this.editor.setLineChars(last.chars, this.editor.linesCount - 1);
        break;
      case 'deleteLine':
        this.editor.insertLine(true, last.line, last.chars.slice(), true);
        break;
      case 'paste':
        for (var i = 0; i< last.oldVal.length; i++) {
          this.editor.setLineChars(last.line + i, last.oldVal[i]);
        }
        break;
    }

    this.editor.moveCursorToPos(last.cur);
    this.actionOffset++;
  }


}
