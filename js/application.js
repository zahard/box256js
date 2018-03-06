
class Box256 {

  constructor() {
    console.log('hello')
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
      nums: layerFactory.create('nums', 2)
    }

    this.drawBackground();

    var kb;
    this.kb = kb = new KeyboardManager(this);

    kb.down('right', () => {
      this.activeCell++;
    })

    kb.down('left', () => {
      this.activeCell--;
    })

    this.cursor = false;

    this.activeCell = 0;

    //this.start();
  }

  start() {
    var count = 0
    var inter = setInterval(()=>{
      this.cursor = !this.cursor;
      this.drawCursor()
    },550);
  }

  drawCursor() {
    const cxt = this.layers.back;

    // zero cell text 32 32
    // zero cell back 32 16

    var x = this.activeCell * 16 + 32;

    if (this.cursor) {
      cxt.set('fillStyle', '#222');
      cxt.fillRect(x,16,16,16);
      cxt.set('fillStyle', '#eee');
      cxt.fillText('0', x, 32);
    } else {
      cxt.set('fillStyle', '#fff');
      cxt.fillRect(x,16,16,16);
      cxt.set('fillStyle', '#222');
      cxt.fillText('0', x, 32);
    }
  }

  drawBackground() {
    const cxt =this.layers.back;
    cxt.fillAll('#222');


    cxt.set('fillStyle', '#eee');
    cxt.set('font', '16px "Modern DOS 437 8x8"');

    cxt.fillText('00 00 00 00', 32, 32)

    cxt.set('fillStyle', 'lightgreen');
    cxt.fillText('000000', 32 + 16 * 11 + 64, 32)



  }
}
