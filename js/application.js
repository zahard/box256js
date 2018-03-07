

var CommandValidator = new commandValidator();

class Box256 {

  constructor() {
    this.width = 640;
    this.height = 640;

    this.wrapper = $('wrapper');

    this.wrapper.style.width = this.width + 'px';
    this.wrapper.style.height = this.height + 'px';

    var layerFactory = new LayersFactory({
        size: [this.width, this.height],
        wrap: this.wrapper
    });


    this.layers = {
      back: layerFactory.create('back', 1),
      data: layerFactory.create('data', 2),
    }

    this.drawBackground();

    setTimeout(()=>{
      this.attachListeners()
    },500);

    this.cursor = false;
    this.cursorPos = 0;

    this.cellsInRow = 12;
    this.cellsInCol = 16;
    this.cSize = 16;

    this.maxCursorPos = this.cellsInRow * this.cellsInCol - 1;

    this.cellsOffset = {x: 4, y: 3};

    this.activeCell = this.getCursorCell();

    this.chars = new Array(this.cellsInRow * this.cellsInCol).fill(null)

    this.instructions = new Array(this.cellsInRow).fill('00000000');

    this.commands = {
      'MOV': 'green',
      'PIX': 'pink',
      'JMP': 'bordo',
      'JNE': 'orange',
      'JEQ': 'orange',
      'JGR': 'orange',
      'ADD': 'aqua',
      'SUB': 'aqua',
      'MUL': 'aqua',
      'DIV': 'aqua',
      'MOD': 'aqua',
    }

    this.loadImages();

  }

  compileFonts() {
    this.colors = {
      white: this.fontImage,
      black: this.copyFont('#222'),
      blue: this.copyFont('#384972'),
      lightblue: this.copyFont('#54aff7'), // 6baef1
      grey: this.copyFont('#5d5751'),
      green: this.copyFont('#3d8154'), //  4f7f58
      lightgreen: this.copyFont('#6ddd64'), //  8ada73
      red: this.copyFont('#e9415b'), //  d74f5e
      orange: this.copyFont('#9f5841'), //  965b46
      pink: this.copyFont('#ed85aa'),
      bordo: this.copyFont('#743253'), // jmp
      aqua: this.copyFont('#807999'), // add

    };
  }

  getCellPosition(pos) {
    var y = ~~(pos / this.cellsInRow);
    var x = pos % this.cellsInRow;

    // Skip gaps between bytes
    x+= ~~(x / 3);

    return {
      x: this.cellsOffset.x + x,
      y: this.cellsOffset.y + y,
    }
  }

  getCursorCell() {
    return this.getCellPosition(this.cursorPos);
  }

  start() {
    this.activeLayer = this.layers.data;
    this.runCursor(false);
  }

  resetCursorInterval() {
    clearInterval(this.cursorInterval);
  }

  runCursor(initalValue) {
    this.cursor = initalValue;
    this.drawCursor();
    this.cursorInterval = setInterval(()=>{
      this.cursor = !this.cursor;
      this.drawCursor()
    }, 500);
  }


  drawCursor(value) {
    if (typeof value == 'undefined') {
      value = this.cursor;
    }

    var charData = this.chars[this.cursorPos] || '0:grey';
    var char = charData.split(':');
    if (value) {
      this.drawText(char[0],
        this.activeCell.x * 16 , this.activeCell.y * 16,
        'black', '#fff');
    } else {
      this.drawText(char[0],
        this.activeCell.x * 16 , this.activeCell.y * 16,
       char[1], '#222');
    }
  }

  removeChar() {
    this.setChar(null);
    this.drawCursor(this.cursor);
  }

  removeCharBack() {
    if (this.cursorPos < 1) {
      return;
    }
    this.moveCursor(CurosorDir.left)
    this.setChar(null);
    this.drawCursor(this.cursor);

  }

  insertChar(char, type) {
    //CHeck is char valid for current cursor position
    var pos = this.cursorPos;
    var rowPos = pos % this.cellsInRow;
    var valid = false;
    switch (type) {
      case "num":
        if (!(rowPos > 0 && rowPos % 3 == 0) || rowPos < 3) {
          this.setChar(char);
          valid = true;
        }
        break;
      case "mem":
      case "ref":
        if (rowPos > 0 && rowPos % 3 == 0) {
          this.setChar(char, type == 'ref' ? 'red':'lightblue');
          valid = true;
        }
        break;
      case "text":
        if (rowPos < 3) {
          this.setChar(char);
          valid = true;
        }
        break;
    }

    if (valid) {
      this.moveCursor(CurosorDir.right);
    }
  }

  setChar(char, color) {
    var pos = this.cursorPos;
    color = color || 'white';
    this.chars[pos] = char?char+':'+color:null;

    this.updateByte(~~(pos/3));
  }

  putChar(pos, char, color) {
    color = color || 'white';
    this.chars[pos] = char?char+':'+color:null;
  }


  drawDataChar(pos) {
    var cell = this.getCellPosition(pos);
    var charData = this.chars[pos] || '0:grey';
    var char = charData.split(':');
    this.drawText(char[0],
      cell.x * 16 , cell.y * 16,
      char[1], '#222');
  }

  drawByteChars(byteIndex) {
    var s = byteIndex * 3;
    for (i=0; i < 3; i++) {
      this.drawDataChar(s+i);
    }
  }

  getByteChars(byteIndex) {
    var s = byteIndex * 3;
    return this.chars.slice(s, s+3);
  }

  setByteChars(byteIndex, word, color) {
    var s = byteIndex * 3;
    for (i=0; i < 3; i++) {
      var pos = s+i;
      if (word[i] !== ' ') {
        this.chars[pos] = word[i]+':'+color;
      } else {
        this.chars[pos] = null;
      }
      //if (pos != this.cursorPos) {
        this.drawDataChar(pos);
      //}
    }
  }

  updateByte(byteIndex) {
    var ctrlCharPos = byteIndex * 3;
    var chars = this.getByteChars(byteIndex);
    var isZero = false;
    if (byteIndex % 4 != 0) {
      isZero = this.updateNumericsChars(byteIndex, chars);
    } else {
      // If command byte
      var word = ''
      var char;
      for (var i=0; char = chars[i], i<3; i++) {
          word += char ? char[0] : '0';
      }

      // If valid command exists
      if (this.commands[word]) {
        this.setByteChars(byteIndex, word, this.commands[word])
      } else {
        // If start from digit or empty- lets update values
        if ( /^[0-9A-F]{3}$/.test(word) ) {
          // Mark fist letter grey
          this.putChar(ctrlCharPos, word[0], 'grey');
          // Actieate numeric values
          isZero = this.updateNumericsChars(byteIndex, chars);

        } else {
          // Other wise disable all byte
          this.setByteChars(byteIndex, word, 'grey')
        }
      }
    }

    this.drawByteMemory(byteIndex);

  }


  updateNumericsChars(byteIndex, chars) {
    var ctrlCharPos = byteIndex * 3;
    // Check if all 3 chars are empty or queal ZERO
    var zeroChars = 0;
    for (var i = 0; i < 3; i++) {
      if(!chars[i] || chars[i][0] == '0') zeroChars++;
    }

    // Disable byte is all zeros
    if (zeroChars == 3) {
      this.setByteChars(byteIndex, '   ', 'grey');
    } else {
      // Activate numbers, and set it to zero
      for (var i = 1; i < 3; i++) {
        var char = chars[i];
        this.putChar(ctrlCharPos + i, char ? char[0] : '0');
        this.drawDataChar(ctrlCharPos + i);
      }
    }
  }

  getWordFromByte(chars) {
    var word = '';
    for (var i = 0; i < 3; i++) {
      word += chars[i] ? chars[i][0] : '0';
    }
    return word;
  }

  getNumFromByte(chars) {
    var num = '';
    for (var i = 1; i < 3; i++) {
      num += chars[i] ? chars[i][0] : '0';
    }
    return num;
  }

  drawByteMemory(byteIndex) {
    var byteNum =  byteIndex % 4;
    var line = ~~(byteIndex / 4);

    var error = true;

    var cmdByteIdx = line * 4;
    var cmdNum = '00';

    // First check COMMAND byte
    var cmdChars = this.getByteChars(cmdByteIdx);
    var cmd = this.getWordFromByte(cmdChars);

    // If command exists - validate it
    if (this.commands[cmd]) {
      var res = this.validateCommand(cmd, cmdByteIdx);
      if (res) {
        cmdNum = res;
        error = false;
      } else {
        cmdNum = '00';
        error = true;
      }
    } else {
      // If valid number inserted
      if ( /^.+[0-9A-F]{2}$/.test(cmd) ) {
        error = false;
        cmdNum = cmd.substr(1);
      } else {
        //Draw 00
        error = true;
        cmdNum = '00'
      }
    }

    var idx = cmdByteIdx;
    var color,chars,num;
    for (var i = 0; i < 4; i++) {
      if (i == 0) {
        num = cmdNum;
      }else {
        idx++;
        num = this.getNumFromByte(this.getByteChars(idx));
      }

      color = error ? 'red': (num == '00' ? 'green' : 'lightgreen');
      this.drawText(num, (20 + i*2) * 16 , (line + 3)*16, color);
    }

  }



  validateCommand(cmd, idx) {
    return CommandValidator.validate(cmd,
      this.getWordFromByte(this.getByteChars(idx + 1)),
      this.getWordFromByte(this.getByteChars(idx + 2)),
      this.getWordFromByte(this.getByteChars(idx + 3))
    );
  }

  drawTextChar(char, color) {
    this.drawText(char, this.activeCell.x * 16 , this.activeCell.y * 16, color, '#222');
    this.moveCursor(CurosorDir.right);
  }

  drawBackground() {
    this.layers.back.fillAll('#222');
  }

  loadImages() {
    this.fontImage = new Image();
    this.fontImage.onload = () => {
      this.compileFonts();
      this.draw();
      this.start();
    }
    this.fontImage.src = 'dos_font_black.png'
  }



  copyFont(color) {
    var cnv = document.createElement('canvas');
    var w = this.fontImage.width;
    var h = this.fontImage.height;
    var layer = new Layer(cnv, w, h, 0, '');
    layer.cxt.drawImage(this.fontImage, 0, 0);
    // Invert
    layer.cxt.globalCompositeOperation = 'source-in';
    // Fill all clipped area exept char with color
    layer.set('fillStyle', color);
    layer.fillRect(0, 0, w, h);
    return layer.cnv;
  }

  draw() {
    this.activeLayer = this.layers.back;
    var lines = []
    for (var i=0;i<64;i++) {
      if (i%4 == 0) {
        var n = i.toString(16).toUpperCase();
        if(i<16) {
          n = '0' + n;
        }
        lines.push(n);
      }
    }

    var y = 16;

    this.drawText('MEMORY', 21 * 16 , y, 'green');

    this.drawText('[    ]', 6 * 16 , y, 'grey');
    this.drawText('SAVE', 7 * 16 , y, 'white');

    this.drawText('[    ]', 13 * 16 , y, 'grey');
    this.drawText('LOAD', 14 * 16 , y, 'white');

    y = 48;

    this.drawText(lines.join("\n"), 16, y, 'blue');

    var nulls = []
    for (var i=0;i<16;i++) {
      nulls.push('000 000 000 000')
    }
    this.drawText(nulls.join("\n"), 16 * 4, y, 'grey');

    var memory = []
    for (var i=0;i<16;i++) {
      memory.push('00000000')
    }
    this.drawText(memory.join("\n"), 20 * 16 , y, 'green');

  }

  drawText(text, x, y, color, bgcolor) {
    this.font = this.colors[color];
    var size = 16;
    var dx = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] == "\n") {
        y += size;
        dx = 0;
        continue;
      }
      this.drawChar(text[i], x + dx * size, y, bgcolor);
      dx++;
    }
  }

  drawChar(char, x, y, bgcolor) {
    const cxt = this.activeLayer;
    var size = 16;
    var fontSize = 8;
    var code = char.charCodeAt();
    var cy = parseInt(code / 16, 10) * 9 + 1;
    var cx = (code % 16) * 9 + 1;

    // Clear
    cxt.set('fillStyle', bgcolor || '#222');
    cxt.fillRect(x, y, size, size);

    // Draw char
    cxt.drawImage(this.font,
      cx, cy, fontSize, fontSize,
      x, y,
      size, size
    );

  }

  attachListeners() {

    window.addEventListener('keydown',function(e) {
      if(e.key == 'Tab') {
        e.preventDefault();
        return;
      }

      if (e.keyCode == 46) {// delete
        this.removeChar();
        return;
      } else if (e.keyCode == 8) {// backspace
        this.removeCharBack();
        return;
      }

    }.bind(this))

    window.addEventListener('keydown',function(e) {
      const code = e.keyCode;

      if (/^[0-9a-fA-F]$/.test(e.key)) {
        this.insertChar(e.key.toUpperCase(), 'num');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        this.insertChar(e.key.toUpperCase(), 'text');
      } else if (e.key == "@") {
        this.insertChar('@', 'mem');
      } else if (e.key == "*") {
        this.insertChar('*', 'ref');
      } else if (code > 36 && code <  41) {
        this.moveCursor(code - 37);
      }
    }.bind(this));
  }

  moveCursor(dir) {
    var pos = this.cursorPos;
    var next = pos;

    //Check if we can move
    switch(dir) {
      case CurosorDir.left:
        if (pos > 0) next--;
        break;
      case CurosorDir.right:
        if (pos < this.maxCursorPos) next++;
        break;
      case CurosorDir.up:
        next = pos - this.cellsInRow;
        if (next < 0) next = pos;
        break;
      case CurosorDir.down:
        next = pos + this.cellsInRow;
        if (next > this.maxCursorPos) next = pos;
        break;
    }

    if (next != this.cursorPos) {
      this.resetCursorInterval();
      // Draw previous value as is
      this.drawCursor(false);

      this.setCursor(next);
      this.runCursor(true);
    }

  }

  setCursor(pos) {
    this.cursorPos = pos;
    this.activeCell = this.getCursorCell();
  }

}

var CurosorDir = {
  left: 0,
  up: 1,
  right: 2,
  down: 3
}





