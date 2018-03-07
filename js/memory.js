

class Memory {

  constructor(size) {
    this.len = size;
    this._memory = new Array(size).fill('00');
    this._changedLines = [];
  }

  get(idx) {
    return this._memory[idx];
  }

  set(idx, val) {
    this._memory[idx] = val;
    this._changedLines.push(~~(idx/4));
  }

  clearChangedLines() {
    this._changedLines = [];
  }

  flushChangedLines() {
    var changed = this._changedLines;
    this._changedLines = [];
    return changed;
  }
}
