
class ScreenRender {

  constructor(offset) {

    this.scrOffset = offset;

    this.pixelSize = 16;

    this.resetPixels();
  }

  resetPixels() {
    this.pixels = new Array(256).fill('0');
  }

  getPixels() {
    return this.pixels.slice();
  }

  drawPixel(x, y, colorIndex) {
    if (colorIndex > 15) {
      colorIndex = colorIndex & 16;
    }

    var cxt = this.layer;
    cxt.save()

    var sx = this.scrOffset.x + x * this.pixelSize + 1;
    var sy = this.scrOffset.y + y * this.pixelSize + 1;
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
