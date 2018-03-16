
/*
Game layers factory
*/
function LayersFactory(options) {
    if (!options.size) throw Error('Miss size');
    this.width = options.size[0];
    this.height = options.size[1];

    // Retina support
    this.isHD = window.devicePixelRatio > 1;

    this.wrap = options.wrap;
    this.wrap.style.width = this.width + 'px';
    this.wrap.style.height = this.height + 'px';
}

LayersFactory.prototype.create = function(name, z_index)
{
    var cnv = document.createElement('canvas');
    cnv.style.width = '100%';
    cnv.style.height = '100%';
    cnv.style.background = 'transparent';
    cnv.style.position = 'absolute';
    this.wrap.appendChild(cnv);

    var layer = new Layer(cnv, this.width, this.height,z_index, name, this.isHD);

    return layer;
}


/**
 * Application Canvas Layer
 */

function Layer(canvas, width, height, z_index, name, isHD) {

  if (isHD) {
    width  *= 2;
    height *= 2;
  }

 	this.width = width;
 	this.height = height;
  canvas.width = this.width;
  canvas.height = this.height;

 	this.cnv  = canvas;
 	if (typeof z_index !== 'undefined')
 	{
 		canvas.style.zIndex = z_index;
 	}

 	this.cxt = canvas.getContext('2d')

  if (isHD) {
    this.cxt.scale(2,2)
  }


  this.cxt.webkitImageSmoothingEnabled = false;
  this.cxt.mozImageSmoothingEnabled = false;
  this.cxt.imageSmoothingEnabled = false; /// future



	this.layerName = name;
 }


Layer.prototype.setZIndex = function(z_index) {
	this.cnv.style.zIndex = z_index;
}

Layer.prototype.empty = function() {

	this.cxt.clearRect(0,0,this.width, this.height);
}

Layer.prototype.fillAll = function(color) {
  this.cxt.save();
  this.set('fillStyle', color);
  this.cxt.fillRect(0,0,this.width, this.height);
  this.cxt.restore();
}

Layer.prototype.hide = function() {
	this.cnv.style.display = 'none';
	return this;
}

Layer.prototype.show = function() {
	this.cnv.style.display = 'block';
	return this;
}

Layer.prototype.move = function(p) {
    this.cxt.moveTo(p.x, p.y);
    return this;
}

Layer.prototype.line = function(p) {
    this.cxt.lineTo(p.x, p.y);
    return this;
}


/**
* Required for using in chaining
*/
Layer.prototype.setProperties = function( properties ) {
	for(var prop in properties ) {
		this.cxt[prop] = properties[prop];
	}
	return this;
}

/**
* Required for using in chaining
*/
Layer.prototype.set = function( name, val ) {
	this.cxt[name] = val;
	return this;
}

/**
* Define setter and getter for all properties of original context
*/
Layer.extendContextProperties = function ( properties ) {
	for(var i in properties) {
		(function( property ) {
			Layer.prototype.__defineGetter__(property, function()  {
				return this.cxt[property];
			});
			Layer.prototype.__defineSetter__(property, function(x)  {
				return this.cxt[property] = x;
			});
		})(properties[i]);
	}
}

/**
* Delegate all methods to original context and return THIS for chaining
*/
Layer.extendContextMethods = function( methods ) {
	for(var i in methods) {
		(function( method ) {
			Layer.prototype[method] = function() {
				return this.cxt[method].apply(this.cxt, arguments);
			}
		})(methods[i]);
	}
}


/**
* Create default canvas element, and basic on their context build Layer prototype
*/
Layer.extendContext = function() {
	var canvasProperties = [];
	var canvasMethods = [];
	defaultCxt = document.createElement('canvas').getContext('2d');
	for( var prop in defaultCxt ) {
        //Dont add specific props
        if (/^webkit|moz.*/.test(prop) ) continue;

		if ( typeof defaultCxt[prop] == 'function' )
			canvasMethods.push(prop);
		else if( defaultCxt.hasOwnProperty(prop) )
			canvasProperties.push(prop);
	}

	Layer.extendContextProperties(canvasProperties);
	Layer.extendContextMethods(canvasMethods);
}

//Extend original context
Layer.extendContext();

