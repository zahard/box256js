

class ViewRender {

  constructor(obj) {
    this.width = obj.width;
    this.height = obj.height;
    this.wrapper = obj.wrapper;
    this.size = obj.cellSize;
    this.lines = obj.lines;
    this.pallete = obj.pallete;

    this.bgColor = '#111';

    // Layer to put data
    this.activeLayer = null;


    var layerFactory = new LayersFactory({
        size: [this.width, this.height],
        wrap: this.wrapper
    });


    this.layers = {
      back: layerFactory.create('back', 1),
      data: layerFactory.create('data', 2),
    }

    this.loadImages();

  }

  onReady(fn) {
    this._onReadCallback = fn;
  }

  // Fill background
  drawBackground() {
    this.activeLayer = this.layers.back;
    this.activeLayer.fillAll(this.bgColor);

    this.drawScreen();
  }

  loadImages() {
    this.fontImage = new Image();
    this.fontImage.onload = () => {

      this.compileFonts();

      this.drawBackground();

      this.activeLayer = this.layers.data;

      // View Ready
      if (this._onReadCallback) {
        this._onReadCallback();
      }
    }
    this.fontImage.src = 'dos_font_black.png'
  }

  compileFonts() {
    this.fontColors = {};
    for (var color in this.pallete) {
      this.fontColors[color] =this.copyFont(this.pallete[color]);
    }
  }

  //* font generator * //
  getFonts() {
    var cnv = document.createElement('canvas');
    cnv.style.background = 'transparent';
    cnv.style.position = 'absolute';
    this.wrapper.appendChild(cnv);
    var cxt = new Layer(cnv, 512, 512, 3, '');
    var i = 0;
    var x = 0;
    var y = 0;
    var tileSize = 128;

    for (var cnv in this.fontColors) {
      if (x > 0 && x % 4 == 0) {
        x = 0;
        y++;
      }
      cxt.drawImage(cnv,
        0,0,
        tileSize, tileSize,
        x * tileSize, y * tileSize,
        tileSize, tileSize,
      )
      x++;
    }
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

  drawTemplate() {
    this.activeLayer = this.layers.back;
    var lines = []
    for (var i=0;i<this.lines*4;i++) {
      if (i%4 == 0) {
        var n = i.toString(16).toUpperCase();
        if(i<16) {
          n = '0' + n;
        }
        lines.push(n);
      }
    }

    var y = 1;

    this._text('MEMORY', 21, y, 'green');

    this._text('[    ]', 5 , y, 'grey');
    this._text('SAVE', 6 , y, 'white');

    this._text('[    ]', 13 , y, 'grey');
    this._text('LOAD', 14 , y, 'white');

    y = 3;

    this._text(lines.join("\n"), 1, y, 'blue');

    this.activeLayer = this.layers.data;

    var nulls = []
    for (var i=0;i<this.lines;i++) {
      nulls.push('000 000 000 000')
    }
    this._text(nulls.join("\n"), 4, y, 'grey');

    var memory = []
    for (var i=0;i<this.lines;i++) {
      memory.push('00000000')
    }
    this._text(memory.join("\n"), 20 , y, 'green');

  }

  drawButton(b) {
    var color = b.active ? 'black' : 'white'
    var color_sec = b.active ? 'black': 'grey'
    var bgColor = b.active ? 'white': 'black';
    var bgColor_sec = b.active ? 'grey': 'black';
    if (b.disabled) {
      color = color_sec = 'grey';
      bgColor = bgColor_sec = 'black';
    }

    this._text('[', b.x, b.y, color_sec, bgColor_sec);
    this._text(b.text, b.x + 1 , b.y, color, bgColor);
    this._text(']', b.x + b.w - 1, b.y, color_sec, bgColor_sec);
  }


  drawText(text, coords, color, bgcolor) {
    var size = this.size;
    var x = coords.x * size;
    var y = coords.y * size;

    this.font = this.fontColors[color];

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

  _text(text, x, y, color, bgcolor) {
    this.drawText(text,{x: x, y: y}, color, bgcolor);
  }

  drawChar(char, x, y, bgcolor) {
    const cxt = this.activeLayer;
    var size = this.size;

    var fontSize = 8;
    var code = char.charCodeAt();
    var cy = parseInt(code / 16, 10) * 9 + 1;
    var cx = (code % 16) * 9 + 1;

    // Clear
    cxt.set('fillStyle', bgcolor || this.bgColor);
    cxt.fillRect(x, y, size, size);

    // Draw char
    cxt.drawImage(this.font,
      cx, cy, fontSize, fontSize,
      x, y,
      size, size
    );
  }

  drawColor(coords, color) {
    var size = this.size;
    var x = coords.x * size;
    var y = coords.y * size;
    const cxt = this.activeLayer;
    // Clear
    cxt.set('fillStyle', color);
    cxt.fillRect(x, y, size, size);
  }

  drawSymbol(index, coords, color, bgcolor) {
    var size = this.size;
    var x = coords.x * size;
    var y = coords.y * size;
    this.font = this.fontColors[color];

    const cxt = this.activeLayer;
    var fontSize = 8;
    var code = index;
    var cy = parseInt(code / 16, 10) * 9 + 1;
    var cx = (code % 16) * 9 + 1;

    // Clear
    cxt.set('fillStyle', bgcolor || this.bgColor);
    cxt.fillRect(x, y, size, size);

    // Draw char
    cxt.drawImage(this.font,
      cx, cy, fontSize, fontSize,
      x, y,
      size, size
    );

  }

  moveLines(coords, height, width, direction, cut) {
    var cxt = this.activeLayer;
    var size = this.size;
    var x = coords.x * size;
    var y = coords.y * size;
    var w = width * size;
    var h = height *size;

    cxt.drawImage(cxt.cnv,
      x, y, w, h - (direction * size),
      x, y + direction * size, w, h - (direction * size));
  }

  drawScreen() {
    var cxt = this.activeLayer;
    cxt.save()
    var scrOffset = {
      y:3, x: 30
    }
    var size = this.size;
    var x = scrOffset.x * size;
    var y = scrOffset.y * size;

    var cell = 16;
    var count = 16;
    var num;

    this.drawGrid(x,y, count, cell);


    this.drawGrid(x,y + 16*cell, count, cell);

    var prevS = this.size;
    this.size = this.size / 2;
    this.font = this.fontColors['white'];
    var xOff = x - 10;
    var yOff = y - 10;
    for (var i = 0; i < count; i++) {
      num = i.toString(16).toUpperCase();
      this.drawChar(num, xOff, y + 4 + i * 16);
      this.drawChar(num, x + 4 + i * 16, yOff);
    }

    cxt.restore();
    this.size = prevS;
  }

  drawGrid(x, y, count, cell) {
    var cxt = this.activeLayer;
    cxt.set('fillStyle', '#555');
    for (var i = 0; i <= count; i++) {
      if (i > 0 && i < count) {
        for (var j = 0; j < 64; j+=1) {
          cxt.fillRect(x  + j*4 , y + (i * cell), 2, 1);
          cxt.fillRect(x + (i * cell), y  + j*4 , 1, 2);
        }
      } else {
        cxt.fillRect(x + (i * cell), y, 1, 256);
        cxt.fillRect(x, y + (i * cell) , 256, 1);
      }
    }
  }

  saveArea(area) {
    if (!this.cache) {
      var cnv = document.createElement('canvas');
      var layer = new Layer(cnv, 64, 64, 0, '');
      this.cache = layer;
    }

    area.x *= this.size;
    area.y *= this.size;
    area.w *= this.size;
    area.h *= this.size;

    var cxt = this.activeLayer;
    this.cache.drawImage(cxt.cnv,
      area.x, area.y,
      area.w, area.h,
      0,0,
      area.w, area.h,
    );

    return area;
  }

  restoreArea(area) {
    var cxt = this.activeLayer;
    cxt.drawImage(this.cache.cnv,
      0,0,
      area.w, area.h,
      area.x, area.y,
      area.w, area.h,
    )
  }

}
