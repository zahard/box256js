class CodeEditor {

  constructor(view, pallete) {
    this.view = view;
    this.pallete = pallete;

    // Whole editor offset
    this.offset = {
      y: 3,
      x: 4
    }

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

    this.bgColor = pallete.black;

    // Array of chars in editor
    this.chars = new Array(this.cellsInRow * this.linesCount).fill('0');

    // Create colors index
    this.colors = {};
    let i = 0;
    for (var c in pallete) {
      this.colors[c] = i++;
    }
    // Chars colors
    this.colorMap = new Array(this.cellsInRow * this.linesCount).fill(this.colors.grey);

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

    const color = 'grey';
    const char = this.getChar(this.cursorPos);
    //var color = this.colorMap[this.cursorPos] || 'grey';
    if (show) {
      this.view.drawText(char, this.cursorCell, 'black', '#fff');
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
      this.moveCursor(this.cursorDir.right);
    }
  }

  /**
  * Return Char at position
  */
  getChar(pos) {
    return this.chars[pos];
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
    this.view.activeLayer = this.view.layers.editor;

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


}
