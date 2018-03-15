
class Button {

  constructor(view, opt) {
    this.view = view;
    this.x = opt.x;
    this.y = opt.y;
    this.text = opt.text;
    this.w = opt.text.length + 2;
    this.handler = opt.handler;
    this.disabled = opt.disabled;
    this.active = false;

    this.draw();
  }

  blur() {
    this.active = false;
    this.draw();
    this.view.wrapper.style.cursor = 'default';
  }

  focus() {
    this.active = true;
    this.draw();
    this.view.wrapper.style.cursor = 'pointer';
  }

  enable() {
    this.disabled = false;
    this.draw();
  }

  disable() {
    this.disabled = true;
    this.draw();
  }

  click() {
    this.handler();
  }

  draw() {
    var color = this.active ? 'black' : 'white'
    var color_sec = this.active ? 'black': 'grey'
    var bgColor = this.active ? 'white': 'black';
    var bgColor_sec = this.active ? 'grey': 'black';
    if (this.disabled) {
      color = color_sec = 'grey';
      bgColor = bgColor_sec = 'black';
    }

    this.view._text('[', this.x, this.y, color_sec, bgColor_sec);
    this.view._text(this.text, this.x + 1 , this.y, color, bgColor);
    this.view._text(']', this.x + this.w - 1, this.y, color_sec, bgColor_sec);
  }

}
