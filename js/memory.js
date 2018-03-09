
class Memory {

  constructor(size) {
    this.len = size;
    this._memory = new Array(size).fill('00');
  }

  getCopy() {
    return this._memory.slice()
  }

  reset(newMemoryArr) {
    this._memory = newMemoryArr;
  }

  get(idx) {
    return this._memory[idx];
  }

  set(idx, val) {
    this._memory[idx] = val;
  }
}
