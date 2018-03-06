/**
 * Keyboard events manager
 */
function KeyboardManager(app) {
	var _this = this;
	this.app = app;
	this.keys = {};

	window.addEventListener('keyup',function(e) {
		var key = _this.keymap[e.keyCode];
		_this.checkKey(key);
		_this.keyup(key, e);
	});

	window.addEventListener('keydown',function(e) {
		var key = _this.keymap[e.keyCode];
		_this.checkKey(key);
		_this.keydown(key, e);
	});
}

/**
* Trigger keydown events
*/
KeyboardManager.prototype.keydown = function(key, e) {
	this.keys[key].isPressed = true;
	for( var i in this.keys[key].down ) {
		this.keys[key].down[i](e,this.keys[key]);
	}
};

/**
* Trigger keyup events
*/
KeyboardManager.prototype.keyup = function(key, e) {
	this.keys[key].isPressed = false;
	for( var i in this.keys[key].up ) {
		this.keys[key].up[i](e,this.keys[key]);
	}
};

/**
* Check if jey is pressed
*/
KeyboardManager.prototype.isPressed = function(key) {
	this.checkKey(key);
	return this.keys[key].isPressed;
};


/**
* Add keydown listener to key
*/
KeyboardManager.prototype.down = function(key, fn) {
	this.checkKey(key);
	this.keys[key].down.push(fn);
};

/**
* Add keyup listener to key
*/
KeyboardManager.prototype.up = function(key, fn) {
	this.checkKey(key);
	this.keys[key].up.push(fn);
};

/**
* Add both keydown and keypress listeners to key
*/
KeyboardManager.prototype.press = function(key, fn1, fn2) {
	this.checkKey(key);
	this.keys[key].down.push(fn1);
	this.keys[key].up.push(fn2);
};

/**
* Check if key already added to key list, if no create it
*/
KeyboardManager.prototype.checkKey = function(key) {
	if( typeof this.keys[key] == 'undefined') {
		this.keys[key] = {
			'up':[],
			'down':[],
			'isPressed': false
		};
	}
};

/**
* Key mappings
*/
KeyboardManager.prototype.keymap  = {
	 8: 'backspace',
	 9: 'tab',
	13: 'enter',
	16: 'shift',
	17: 'ctrl',
	18: 'alt',
	19: 'pause',
	20: 'capslock',
	27: 'escape',
	32: 'space',
	33: 'pageup',
	34: 'pagedown',
	35: 'home',
	36: 'end',
	37: 'left',
	38: 'up',
	39: 'right',
	40: 'down',
	45: 'insert',
	46: 'delete',
	61: '+',
	189: '-'
};

//Build mapping abc and 0-9
(function(){
	var abc = 'abcdefghijklmnopqrstuvwxyz';
	for(var i = 0; i < 26; i++) {
		KeyboardManager.prototype.keymap[65+i] = abc[i];
	}
	
	for(var j = 0; j < 10; j++) {
		KeyboardManager.prototype.keymap[48+j] = "" + j;
	}
})();