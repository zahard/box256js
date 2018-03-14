
class ScreenRender {

  constructor(view, offset) {
    this.view = view;
    this.offset = offset;

    // Application grid size for offsets
    this.gridSize = 16;

    // Pixel/ cell size
    this.pixelSize = 16;

    // 16 x 16 screen
    this.screenSize = 16;

    this.resetPixels();
  }

  // Draw grid
  draw(putNums) {
    const cxt = this.view.activeLayer;
    cxt.save();

    const x = this.offset.x * this.gridSize;
    const y = this.offset.y * this.gridSize;
    this.drawGrid(x,y, this.screenSize, this.pixelSize);

    if (putNums) {
      this.view.setFont('white');
      const border = 2;
      const fontSize = this.pixelSize / 2;
      const margin = (this.pixelSize - fontSize) / 2
      const xOff = x - (this.view.size + border);
      const yOff = y - (this.view.size + border);

      for (var i = 0; i < this.screenSize; i++) {
        let num = i.toString(16).toUpperCase();
        let dx = x + i * this.pixelSize + margin;
        let dy = y + i * this.pixelSize + margin;
        // Verical line
        this.view.drawChar(num, xOff, dy, null, fontSize);
        // Horizontal line
        this.view.drawChar(num, dx, yOff, null, fontSize);
      }
    }

    cxt.restore();
  }

  drawGrid(x, y, count, cellSize) {
    var cxt = this.view.activeLayer;
    cxt.save();
    cxt.set('fillStyle', '#555');

    for (var i = 0; i <= count; i++) {

      if (i > 0 && i < count) {
        var len = count * cellSize;

        for (var j = 0; j < len/4; j+=1) {
          cxt.fillRect(x  + j*4 , y + (i * cellSize), 2, 1);
          cxt.fillRect(x + (i * cellSize), y  + j*4 , 1, 2);
        }

      } else {
        // Straight lines
        cxt.fillRect(x + (i * cellSize), y, 1, count * cellSize);
        cxt.fillRect(x, y + (i * cellSize) , count * cellSize, 1);
      }
    }
    cxt.restore();
  }


  resetPixels() {
    this.pixels = new Array(this.screenSize*this.screenSize).fill('0');
  }

  getPixels() {
    return this.pixels.slice();
  }

  drawPixel(x, y, colorIndex) {
    if (colorIndex > 15) {
      colorIndex = colorIndex & 16;
    }

    var cxt = this.view.activeLayer;
    cxt.save()

    var sx = this.offset.x * this.gridSize + x * this.pixelSize + 1;
    var sy = this.offset.y * this.gridSize + y * this.pixelSize + 1;
    var color = this.getColor(colorIndex);
    cxt.set('fillStyle', color);
    cxt.fillRect(sx, sy, this.pixelSize - 1, this.pixelSize - 1);
    cxt.restore();
    // Set pixel value
    this.pixels[x + y * 16] = colorIndex.toString(16).toUpperCase();
  }

  resetScreen() {
    for (var x = 0; x < 16; x++) {
      for (var y = 0; y < 16; y++) {
        this.drawPixel(x,y, 0);
      }
    }
    this.resetPixels();
  }

  getColor(index) {
    if (index > 15) index = index % 16;
    var pixelColors = [
    '#111','#354367','#6c3652','#4f7f58','#965b46','#5d5751',
    '#c2c3c7','#fbf1ea','#d74f5e','#e7a856','#fef877',
    '#8ada73','#6baef1','#726d87','#df8ba9','#f0ceb4'
    ];
    return pixelColors[index];
  }

}
