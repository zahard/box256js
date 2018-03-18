

class ViewRender {

  constructor(obj) {
    this.width = obj.width;
    this.height = obj.height;
    this.wrapper = obj.wrapper;
    this.size = obj.cellSize;
    this.gridSize = obj.cellSize;

    this._onReadCallback = obj.onReady;

    this.pallete = new Pallete();
    this.bgColor = this.pallete.black;


    var layerFactory = new LayersFactory({
        size: [this.width, this.height],
        wrap: this.wrapper
    });


    this.layers = {
      back: layerFactory.create('back', 1)
    }

    // Layer to put data
    this.activeLayer = this.layers.back;

    this.loadImages();
  }


  // Fill background
  drawBackground() {
    this.activeLayer.fillAll(this.bgColor);
  }

  loadImages() {
    this.fontImage = new Image();
    this.fontImage.onload = () => {

      this.compileFonts();

      this.drawBackground();

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

  drawText(text, coords, color, bgcolor, fontSize) {
    var x = coords.x * this.gridSize;
    var y = coords.y * this.gridSize;

    this.font = this.fontColors[color];

    var size = fontSize || this.size;

    var dx = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] == "\n") {
        y += size;
        dx = 0;
        continue;
      }
      this.drawChar(text[i], x + dx * size, y, bgcolor, fontSize);
      dx++;
    }
  }

  _text(text, x, y, color, bgcolor, fontSize) {
    this.drawText(text,{x: x, y: y}, color, bgcolor, fontSize);
  }

  setFont(color) {
    this.font = this.fontColors[color];
  }

  drawChar(char, x, y, bgcolor, charSize) {
    const cxt = this.activeLayer;
    var size = charSize || this.size;

    var fontSize = 8;
    var code = char.charCodeAt();
    var cy = parseInt(code / 16, 10) * (fontSize+1) + 1;
    var cx = (code % 16) * (fontSize+1) + 1;

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

  drawHelp(coords, targetWidth) {
    var help = [
      ['012 = Constant value 12', 'grey'],[],
      ['@','lightblue','24 = Memory slot 24', 'grey'],[],
      ['*','red','32 = Memory pointed by slot 32', 'grey'],[],
      ['MOV', 'green',' A B C', 'blue'],
      ['Copy C cells from A to B', 'grey'],[],
      ['PIX', 'pink',' A B', 'blue'],
      ['Draw color B in location A', 'grey'],[],
      ['JMP', 'bordo',' A', 'blue'],
      ['Jump to instruction at A', 'grey'],[],
      ['JEQ', 'brick',' A B C', 'blue'],
      ['Jump to C if A == B', 'grey'],[],
      ['JGR', 'brick',' A B C', 'blue'],
      ['Jump to C if A > B', 'grey'],[],
      ['JNE', 'brick',' A B C', 'blue'],
      ['Jump to C if A != B', 'grey'],[],
      ['FLP', 'green',' A B C', 'blue'],
      ['Swap C cells between A and B', 'grey'],[],
      ['THR', 'yellow',' A B C', 'blue'],
      ['Start a new thread at A', 'grey'],[],

      ['ADD', 'purple',' A B C', 'blue'],
      ['Set C = A + B', 'grey'],[],
      ['SUB', 'purple',' A B C', 'blue'],
      ['Set C = A - B', 'grey'],[],
      ['MUL', 'purple',' A B C', 'blue'],
      ['Set C = A * B', 'grey'],[],
      ['DIV', 'purple',' A B C', 'blue'],
      ['Set C = A / B', 'grey'],[],
      ['MOD', 'purple',' A B C', 'blue'],
      ['Set C = A % B', 'grey'],
    ];

    var h = (help.length + 2) * this.size;
    var w = 32 * this.size;
    var x = 0;
    var y = 0;
    var tmpCnv = document.createElement('canvas');
    var tmpLayer = new Layer(tmpCnv, w, h, 0, '');

    this.activeLayer = tmpLayer;

    this._text('Pallete =', x, y, 'grey');
    var pos = 0;
    for (var c of this.pallete.indexColors) {
      this._text(pos.toString(16).toUpperCase(), pos + 10, y, pos == 0 ? 'grey' : 'black', this.pallete[c]);
      pos++;
    }
    y+=2;

    for (let i = 0; i < help.length; i++) {
      let line = help[i];
      let pos = 0;
      for (let c = 0; c < line.length; c+=2) {
        let text = line[c];
        let color = line[c+1];
        this._text(text, x + pos, y, color );
        pos += text.length;
      }
      y++;
    }

    this.activeLayer = this.layers.back;
    var ctx = this.activeLayer;
    var sx = coords.x * this.size;
    var sy = coords.y * this.size;

    var ratio = w / h;
    var tw = targetWidth * this.size;
    var th  = tw / ratio;

    ctx.drawImage(tmpCnv, 0,0, w, h, sx, sy, tw, th)
  }
}
