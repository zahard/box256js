/**
 * Convert Angle Degrees to Radians
 * and shift angle to -90 so 0 is represent UP direction
 */
function rad( angle ) {
	var radians = (Math.PI / 180) * (angle - 90);
	return radians;
}


/**
 * Alias for get element by id
 */
function $(id) {
	return document.getElementById(id);	
} 

/**
 * Return random number from range
 * 
 * If 1 argument passed it mean from 0 to NUMBER
 */
function rand(){
	var from = 0,
	    to = 0;

	if( arguments.length == 1 ) {
		from = 0;
		to = arguments[0];
	} else {
		from = arguments[0];
		to = arguments[1];
	}

	return Math.floor( Math.random() * ( to - from + 1 ) + from );
}


function extend(Child, Parent) {
	var F = function() {};
	F.prototype = Parent.prototype;
	Child.prototype = new F();
	Child.prototype.constructor = Child;
	Child.superclass = Parent.prototype;
}

function HSVtoRGB(h, s, v) {
	    var r, g, b, i, f, p, q, t;
	    if (h && s === undefined && v === undefined) {
	        s = h.s; v = h.v; h = h.h;
	    }
	    i = Math.floor(h * 6);
	    f = h * 6 - i;
	    p = v * (1 - s);
	    q = v * (1 - f * s);
	    t = v * (1 - (1 - f) * s);
	    switch (i % 6) {
	        case 0: r = v; g = t; b = p; break;
	        case 1: r = q; g = v; b = p; break;
	        case 2: r = p; g = v; b = t; break;
	        case 3: r = p; g = q; b = v; break;
	        case 4: r = t; g = p; b = v; break;
	        case 5: r = v; g = p; b = q; break;
	    }

	    var c = {
	        r: Math.floor(r * 255),
	        g: Math.floor(g * 255),
	        b: Math.floor(b * 255)
	    };

	    return 'rgb('+c.r+','+c.g+','+c.b+')';
}

/**
 * Remove object from array. Only for objects/arrays 
 */

function removeItem(array, obj) {
	var i = array.indexOf(obj);
	if( i != -1 ) {
		array.splice(i,1);
	}
}
