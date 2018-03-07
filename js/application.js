
function con(str) {
  color = '#';
  var arr = str.split(' ');
  arr.forEach(n => {
    n = parseFloat(n.trim());
    color += n.toString(16);
  })
  return color
}

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
      nums: layerFactory.create('nums', 2),
      data: layerFactory.create('data', 3),
    }

    this.drawBackground();

    var kb;
    this.kb = kb = new KeyboardManager(this);

    kb.down('down', () => {
      if (this.activeCell.y < 12) {
        this.resetCursorInterval();
        this.drawCursor(false);
        this.activeCell.y++;
        this.drawCursor(true);
        this.runCursor(true);
      }
    });

    kb.down('up', () => {
      if (this.activeCell.y > 3) {
        this.resetCursorInterval();
        this.drawCursor(false);
        this.activeCell.y--;
        this.drawCursor(true);
        this.runCursor(true);
      }
    });

    kb.down('right', () => {
      this.resetCursorInterval();
      this.drawCursor(false);

      this.moveRight();

      this.drawCursor(true);
      this.runCursor(true);
    });

    kb.down('left', () => {
      this.resetCursorInterval();
      this.drawCursor(false);

      this.moveLeft();

      this.drawCursor(true);
      this.runCursor(true);
    })

    kb.up('1', () => {
      console.log('1')
    })

    window.addEventListener('keyup',function(e) {
      if (/^[0-9]$/.test(e.key)) {
        this.insertChar(e.key, 'white');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        this.insertChar(e.key.toUpperCase(), 'orange');
      } else if (e.key == "@") {
        this.insertChar('@', 'lightblue');
      } else if (e.key == "*") {
        this.insertChar('*', 'red');
      }

    }.bind(this));

    this.cursor = false;

    this.activeCell = {
      x:4, y: 3
    };

    this.bytes = [];

    this.loadImages();

  }

  moveLeft() {
    var x = this.activeCell.x - 1;
    if ((x-3) % 4 == 0) {
      if (x < 4) {
        if (this.activeCell.y < 4) {
          return;
        }
        this.activeCell.y--;
        this.activeCell.x = 18;
      } else {
        this.activeCell.x -= 2;
      }
    } else {
      this.activeCell.x--;
    }
  }


  moveRight() {
    this.activeCell.x++;
    var x = this.activeCell.x;
    if ((x-3) % 4 == 0) {
      if (x > 17) {
        this.activeCell.y++;
        this.activeCell.x = 4;

      } else {
        this.activeCell.x++;
      }

    }
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
    this.cursorInterval = setInterval(()=>{
      this.cursor = !this.cursor;
      this.drawCursor()
    }, 500);
  }

  drawCursor(value) {
    if (typeof value == 'undefined') {
      value = this.cursor;
    }
    if (value) {
      this.drawText('0',
        this.activeCell.x * 16 , this.activeCell.y * 16,
        'black', '#fff');
    } else {
      this.drawText('0',
        this.activeCell.x * 16 , this.activeCell.y * 16,
       'grey');
    }
  }

  insertChar(char, color) {
    this.resetCursorInterval();

    this.drawText(char, this.activeCell.x * 16 , this.activeCell.y * 16, color, '#222');

    this.moveRight();
    this.runCursor(true);
    this.drawCursor(true);
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

  compileFonts() {
    this.colors = {
      white: this.fontImage,
      black: this.copyFont('#222'),
      blue: this.copyFont('#384972'),
      lightblue: this.copyFont('#6baef1'),
      grey: this.copyFont('#5d5751'),
      green: this.copyFont('#4f7f58'),
      lightgreen: this.copyFont('#8ada73'),
      red: this.copyFont('#d74f5e'),
      orange: this.copyFont('#965b46'),
    };
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
    this.activeLayer = this.layers.nums;
    var lines = []
    for (var i=0;i<40;i++) {
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
    for (var i=0;i<10;i++) {
      nulls.push('000 000 000 000')
    }
    this.drawText(nulls.join("\n"), 16 * 4, y, 'grey');

    var memory = []
    for (var i=0;i<10;i++) {
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
    if (bgcolor) {
      cxt.set('fillStyle', bgcolor);
      cxt.fillRect(x, y, size, size);
    } else {
      cxt.clearRect(x, y, size, size);
    }


    // Draw char
    cxt.drawImage(this.font,
      cx, cy, fontSize, fontSize,
      x, y,
      size, size
    );

  }

  drawInveretedChar(char, x, y) {
    const cxt = this.layers.nums;

    var size = 8;
    var fontSize = 8;
    var code = char.charCodeAt();

    // Clear
    cxt.clearRect(x, y, size, size);
    if (code == 32) {
      // Code for Space
      return;
    }

    var cy = parseInt(code / 16, 10) * 9 + 1;
    var cx = (code % 16) * 9 + 1;

    cxt.save();

    //Clear clipping path around char
    cxt.beginPath();
    cxt.moveTo(x, y);
    cxt.lineTo(x + size, y);
    cxt.lineTo(x + size, y +size);
    cxt.lineTo(x, y + size);
    cxt.closePath();
    cxt.clip();

    //Draw char
    cxt.drawImage(this.font,
      cx, cy, fontSize, fontSize,
      x, y,
      size, size
    );
    // Invert
    cxt.cxt.globalCompositeOperation = 'source-out';
    // Fill all clipped area exept char with color
    cxt.set('fillStyle', '#fff');
    cxt.fillRect(x, y, size, size);

    cxt.restore();
  }



}






