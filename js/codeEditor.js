class CodeEditor {

  constructor(view, offset, pallete) {
    this.view = view;
    this.pallete = pallete;

    this.commandList = new CommandList();

    this.events = {};

    // Whole editor offset
    this.offset = offset;

    // Base cell size
    this.cellSize = 16;

    // Amount of editable lines
    this.linesCount = 32;

    // Active area width
    this.cellsInRow = 12;

    // Index of char pointed by cursor
    this.cursorPos = 0;

    // View position
    this.cursorCell = this.coord(0,0);

    // Display reversed or usual
    this.cursorShow = false;

    // Interval for cursor animation
    this.cursorInterval = 0;

    this.cursorDir = {
      left: 0,
      up: 1,
      right: 2,
      down: 3
    };

    // Selecetd lines
    this.activeSelection = [];
    // Clipboard content
    this.clipboard = [];

    this.bgColor = pallete.black;

    // Array of chars in editor
    this.chars = new Array(this.cellsInRow * this.linesCount).fill('0');

    // Create colors index
    this.colors = {};
    this.indexColors = [];
    let i = 0;
    for (var c in pallete) {
      this.colors[c] = i++;
      this.indexColors.push(c);
    }
    // Chars colors
    this.colorMap = new Array(this.cellsInRow * this.linesCount).fill(this.colors.grey);

    // Modifiers colors
    this.modColors = [
      this.colors.lightblue, // @
      this.colors.red, // *
      this.colors.white, // -
    ];

    // Save action for ability to undo
    this.actionsBuffer = new ActionsBuffer(this);

    // Keyboard events
    setTimeout(() => {
      this.attachListeners()
    }, 500);

  }

  /**
  * Set cursor position
  */
  setCursor(pos) {
    this.cursorPos = pos;
    this.cursorCell = this.getCellPosition(pos);
  }

  /**
   * Run cursor animation
   */
  runCursor(show) {
    this.cursorShow = show;
    this.drawCursor();

    clearInterval(this.cursorInterval);
    this.cursorInterval = setInterval(() => {
      this.cursorShow = !this.cursorShow;
      this.drawCursor();
    }, 500);
  }

  /**
  * Move cursor to direction (up,down etc)
  */
  moveCursor(dir) {
    var offset = dir % 2 ? this.cellsInRow : 1;
    var next = this.cursorPos + (dir < 2 ? -offset : offset);
    var maxCursor = this.linesCount * this.cellsInRow;
    if (next < 0) {
      next = maxCursor + next;
    } else if (next >= maxCursor) {
      next = next - maxCursor;
    }
    this.moveCursorToPos(next);
  }

  /**
  * Move cursor to selected position
  */
  moveCursorToPos(pos) {
    if (pos === this.cursorPos) return;

    // Draw previous value as is
    this.drawCursor(false);
    // Set new pos and run
    this.setCursor(pos);
    this.runCursor(true);
  }
  /**
   * Redraw cursor on its position
   */
  drawCursor(show) {
    if (typeof show === 'undefined') {
      show = this.cursorShow;
    }

    const char = this.getChar(this.cursorPos);
    const color = this.getCharColor(this.cursorPos);

    if (show) {
      this.view.drawText(char, this.cursorCell, 'black', 'white');
    } else {
      this.view.drawText(char, this.cursorCell, color, this.bgColor);
    }
  }

  /**
  * Insert new char on current position
  */
  insertChar(char) {
    // Validate if char can be accepted
    let valid = false;

    // Zero acceptable in every place
    if (char === '0') {
      valid = true;
    } else {
      const rowPos = this.cursorPos % this.cellsInRow;
      const isModifier = /^[\@\-\*]$/.test(char);
      const isNum = /^[0-9A-F]$/.test(char);

      if (rowPos < 3) {
        // Allow all except modifiers in command byte
        valid = !isModifier
      } else {
        // If its first char of byte it can be obly modifier
        // Rest two chars only numbers
        valid = (rowPos % 3 == 0) ? isModifier : isNum;
      }
    }

    if (valid) {

      this.saveChar(this.cursorPos, char);

      this.setChar(char, this.cursorPos);

      // Redraw line
      const line = this.getCharLine(this.cursorPos);
      this.updateLine(line);

      this.moveCursor(this.cursorDir.right);
    }
  }

  setChar(char, pos) {
    this.chars[pos] = char;
  }

  getChar(pos) {
    return this.chars[pos];
  }

  setCharColor(pos, color) {
    this.colorMap[pos] = color;
  }

  getCharColor(pos) {
    const cIdx = this.colorMap[pos];
    return this.indexColors[cIdx];
  }

  /**
   * Delete char under cursor
   */
  deleteChar(isBackspace) {
    const pos = this.cursorPos;
    if (isBackspace) {
      if (pos === 0) return;
      this.moveCursor(0);
    }


    if (isBackspace) {
      this.saveChar(this.cursorPos, '0', this.cursorPos + 1);
    } else{
      this.saveChar(this.cursorPos, '0');
    }

    this.setChar('0', this.cursorPos);

    this.updateLine(this.getCharLine(pos));

    this.drawCursor();
  }

  saveChar(pos, char, saveCursor) {
    if (char !== this.getChar(pos)) {
      var cur = saveCursor || pos;
      var prevCur = saveCursor ? saveCursor - 1 : cur + 1;
      this.actionsBuffer.add({
        pos: pos,
        type: 'char',
        oldVal: this.getChar(pos),
        newVal: char,
        cur: cur,
        prevCur: prevCur
      });
    }
  }


  /**
   * Return line number of position
   */
  getCharLine(pos) {
    return ~~(pos/this.cellsInRow);
  }

  /**
   * Get byte string
   */
  getByte(byteIndex) {
    var s = byteIndex * 3;
    return this.chars.slice(s, s + 3).join('');
  }

  /**
   * Full line in string
   */
  getLine(line) {
    var s = line * this.cellsInRow;
    return this.chars.slice(s, s + this.cellsInRow).join('');
  }

  /**
   * Set new chars into line
   */
  setLineChars(line, chars) {
    var start = line * this.cellsInRow;
    for (var i = 0; i < this.cellsInRow; i++) {
      this.setChar(chars[i] || '0', start + i);
    }
    this.updateLine(line);
  }

  updateCharLine(pos) {
    var line = this.getCharLine(pos);
    this.updateLine(line);
  }

  /**
   * Update chars color in line
   * and redraw it
   */
  updateLine(line) {
    this.updateLineColors(line);
    this.drawLine(line);
    this.emit('lineUpdate', line, this.getLine(line));
  }

  /**
   * Update color of chars in line
   */
  updateLineColors(line) {
    const byteIndex = line * 4;
    const requiredArgs = this.updateCmdByteColor(byteIndex);
    let required;
    for (var i = 1; i <= 3; i++) {
      required = i <= requiredArgs;
      this.updateByteColor(byteIndex + i, required);
    }
  }

  /**
   * Update color of first byte wich
   * can contain instructions
   */
  updateCmdByteColor(byteIndex) {
    var byte = this.getByte(byteIndex);
    // If valid command exists
    var command = this.commandList.getCommand(byte)
    if (command) {
      this.setByteColor(byteIndex, this.colors[command.color]);
      return command.required;
    } else {
      // If commmand byte is constant value
      if ( /^[0-9A-F]{3}$/.test(byte) ) {
        this.updateByteColor(byteIndex, 0);
      } else {
        // Disable invalid command
        this.setByteColor(byteIndex, this.colors.grey);
      }
    }
    return 0;
  }

  /**
   * Update color of numeric bytes
   */
  updateByteColor(byteIndex, required) {
    var byte = this.getByte(byteIndex);

    // Empty byte
    if (byte === '000' && !required) {
      this.setByteColor(byteIndex, this.colors.grey);
    } else {
      const c = '@*-'.indexOf(byte[0]);
      var colors = [
        (c > -1)  ? this.modColors[c]: this.colors.grey,
        this.colors.white,
        this.colors.white];

      this.setByteColor(byteIndex, colors);
    }
  }


  /**
   * Set byte chars colors
   */
  setByteColor(byteIndex, colors) {
    // if color is string, apply same color
    // to all chars in byte
    if (!Array.isArray(colors)) {
      colors = new Array(3).fill(colors);
    }
    var start = byteIndex * 3;
    for (i = 0; i < 3; i++) {
      this.setCharColor(start + i, colors[i])
    }
  }

  /**
   * Redraw cahrs line
   */
  drawLine(line) {
    var start = line * this.cellsInRow;
    for (var i = 0; i < this.cellsInRow; i++) {
      this.drawChar(start + i);
    }
  }

  /**
   * Draw single char
   */
  drawChar(pos) {
    const cell = this.getCellPosition(pos);
    const char = this.getChar(pos);
    const color = this.getCharColor(pos);
    this.view.drawText(char, cell, color, this.bgColor);
  }

  /**
   * On delte key handler
   */
  onDelete() {
     if (this.cursorPos % this.cellsInRow == 0) {
      this.deleteLine();
    } else {
      // Delete single char
      this.deleteChar();
    }
  }



  /**
   * Delete whole line and shift all lines up
   */
  deleteLine(line, skipBuffer) {
    if (!line) {
      line = ~~(this.cursorPos/this.cellsInRow);
    }

    const pos = line * this.cellsInRow; // next row position

    // Hide cursor before copy part of screen
    this.drawCursor(false);

    if (!skipBuffer) {
      this.actionsBuffer.add({
        type: 'deleteLine',
        line: line,
        chars: this.getLine(line),
        cur: pos
      });
    }

    // New chars
    const newChars = new Array(this.cellsInRow).fill('0');
    this.unshiftArray(this.chars, pos, newChars)
    // Colors
    var newColors = new Array(this.cellsInRow).fill('grey');
    this.unshiftArray(this.colorMap, pos, newColors)


    const nextLine = line + 1;
    const shiftedLines = this.linesCount - nextLine;
    const cell = this.getCellPosition(nextLine * this.cellsInRow);
    this.view.moveLines(cell, shiftedLines, 18, -1);

    // Draw new line at the end
    this.updateLine(this.linesCount - 1);

    // update cursor
    this.drawCursor(true);

  }

  /**
   * Insert new line and shift lines below
   */
  insertLine(stayOnLine, line, chars, skipBuffer) {
    if (!line) {
      line = this.getCharLine(this.cursorPos);
    }

    let nextLine = stayOnLine ? line : line + 1;
    if (nextLine >= this.linesCount) {
      return;
    }
    const pos = nextLine * this.cellsInRow;

    // Hide cursor before copy part of screen
    this.drawCursor(false);

    // New line chars
    const newChars = chars ? chars : new Array(this.cellsInRow).fill('0');
    // Removed chars from end
    const removed = this.shiftArray(this.chars, pos, newChars)

    // Shift color map
    const newColors = new Array(this.cellsInRow).fill(this.colors.grey);
    this.shiftArray(this.colorMap, pos, newColors);

    // To not render all below lines
    // just shift view to one cell below
    const shiftedLines = this.linesCount - nextLine;
    this.view.moveLines(this.getCellPosition(pos), shiftedLines, 18, 1);

    // Update new line
    this.updateLine(nextLine);

    // Put cursor on new line
    this.moveCursorToPos(pos);
    this.drawCursor(true);

    if (!skipBuffer) {
      this.actionsBuffer.add({
        type: 'insertLine',
        line: nextLine,
        cur: stayOnLine ? pos : pos - this.cellsInRow,
        prevCur: pos,
        chars: removed
      });
    }

  }

  /**
   * Add line to selected area
   */
  selectLines(dir) {
    const line = this.getCharLine(this.cursorPos);

    // If no active selection
    if (!this.activeSelection.length) {
      // Add to selected array
      this.activeSelection.push(line);
      this.moveCursor(dir);
      this.drawSelectionLine(line, true);
      return;
    }

    if (this.activeSelection.length == this.linesCount) {
      return;
    }

    this.moveCursor(dir);

    var nextLine = (line == (this.linesCount - 1)) ? 0 : line + 1;
    var prevLine = (line == 0) ? this.linesCount - 1 : line - 1;

    var updateLine = line;
    var active = false;

    if (dir == 1) {
      if (this.activeSelection[0] == nextLine) {
        this.activeSelection.unshift(line);
        active = true;
      } else {
        this.activeSelection.pop();
        updateLine = prevLine;
      }
    } else {
      if (this.activeSelection[this.activeSelection.length-1] == prevLine) {
        this.activeSelection.push(line);
        active = true;
      } else {
        this.activeSelection.unshift();
        updateLine = nextLine;
      }
    }

    this.drawSelectionLine(updateLine, active);
  }

  resetSelection() {
    this.activeSelection.forEach(l => {
      this.drawSelectionLine(l);
    });
    this.activeSelection = [];
  }

  copySelection() {
    this.clipboard = this.activeSelection.map(l => {
      return this.getLine(l);
    });
    this.resetSelection();
  }

  pasteSelection() {
    if (!this.clipboard.length) return;

    const lines = [];
    const startLine = this.getCharLine(this.cursorPos);
    for (var i = 0; i < this.clipboard.length ;i++) {
      const line = startLine + i;
      if (line >= this.linesCount) {
        break;
      }
      lines.push(this.getLine(line));
      this.setLineChars(line, this.clipboard[i]);
    }

    var oldChars = lines.join('');
    var newChars = this.clipboard.join('');
    if (oldChars !== newChars) {
      this.actionsBuffer.add({
        type: 'paste',
        line: startLine,
        cur: startLine * this.cellsInRow,
        oldVal: lines,
        newVal: this.clipboard.slice()
      });
    }

  }

  drawSelectionLine(line, active) {
    const start = line * this.cellsInRow;
    if (active) {
      for (let i = 0; i < this.cellsInRow; i++) {
        const pos = start + i;
        const cell = this.getCellPosition(pos);
        const char = this.getChar(pos)
        this.view.drawText(char, cell, 'black', 'white');
      }
    } else {
      this.drawLine(line);
    }

    const color = active ? 'white' : this.bgColor;
    const firstCell = this.getCellPosition(start);
    // Fill space between columns
    for (let i = 3; i < this.cellsInRow; i+=4) {
      this.view.drawColor({
        y: firstCell.y,
        x: firstCell.x + i
      }, color);
    }
  }



  /**
   * Insert values to arrat and trim end
   */
  shiftArray(arr, pos, values) {
    const len = arr.length;
    arr.splice.apply(arr, [pos, 0].concat(values));
    return arr.splice(len);
  }

  /**
   * Removes values from position
   * and append to end
   */
  unshiftArray(arr, pos, values) {
    const len = values.length;
    arr.splice(pos, len);
    arr.push.apply(arr, values);
  }

  /**
  * Get view cell coordinates of char at position
  */
  getCellPosition(pos) {
    const y = ~~(pos / this.cellsInRow);
    let x = pos % this.cellsInRow;

    // Skip gaps between bytes
    x+= ~~(x / 3);

    return this.coord(x, y);
  }

  /**
  * Editor relative coordinates
  * started from 0 zero cell
  */
  coord(x, y) {
    return {
      x: x + this.offset.x,
      y: y + this.offset.y
    }
  }

  /**
   * Draw empty editor
   */
  draw() {
    var nulls = [];
    var lineNum = [];
    for (var i = 0; i < this.linesCount; i++) {
      nulls.push('000 000 000 000');
      var pos = (i*4);
      var n = pos.toString(16).toUpperCase();
      if (pos < 16) {
        n = '0' + n;
      }
      lineNum.push(n);
    }
    this.view.drawText(lineNum.join("\n"), this.coord(-3, 0), 'blue');
    this.view.drawText(nulls.join("\n"), this.coord(0, 0), 'grey');

    //this.view.activeLayer = this.view.layers.data;
  }

  attachListeners() {
    window.addEventListener('keydown',function(e) {
      const code = e.keyCode;
      const key = e.key;
      const isCtrl = e.ctrlKey || e.metaKey;

      if (code == 91 || e.key == "Meta" || code == 17 || code == 16) {
        return;
      }

      if (code == 90 && isCtrl ) {
        this.actionsBuffer.undo();
        return;
      }

      if (code == 89 && isCtrl ) {
        this.actionsBuffer.redo();
        return;
      }

      if (code == 86 && isCtrl ) {
        this.pasteSelection();
        return;
      }

      if (this.activeSelection.length) {
        if (code == 67 && isCtrl ) {
          this.copySelection();
          return;
        }

        if (code != 16  && !(e.shiftKey && (code == 38 || code == 40))) {
          this.resetSelection();
        }
      }

      if (isCtrl) {
        return;
      }

      switch (code) {
        case 9: // TAB
          e.preventDefault();
          return;
        case 46: // DELETE
          this.onDelete();
          return;
        case 8: // BACKSPACE
          this.deleteChar(true);
          e.preventDefault();
          return;
        case 13: // ENTER
          this.insertLine(e.shiftKey)
          return;
      }

      // Validate input chars
      if (/^[0-9a-zA-Z\@\*\-]$/.test(e.key)) {
        this.insertChar(e.key.toUpperCase());
      }

      // Navigate
      if (code > 36 && code <  41) {
        if (e.shiftKey && code % 2 == 0) {
          this.selectLines(code - 37);
        } else {
          this.moveCursor(code - 37);
        }
        e.preventDefault();
      } else if (code == 32) {
        // Spacebar
        this.moveCursor(2);
      }
    }.bind(this));
  }

  on(event, fn) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(fn);
  }

  emit(event) {
    if (!this.events[event]) return;
    const args = [].slice.call(arguments, 1);
    this.events[event].forEach(fn => {
      fn.apply(this, args);
    })
  }

}
