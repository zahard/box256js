

var Vertaxis = {

	define: function(namespace, parent, constructor, prototype)
	{
		var names = namespace.split('.');
		var className = names.pop();
		var endpoint = this.createNamespace(window, names.join(''));

		this.extend(constructor,parent);

		for (var i in prototype)
		{
			constructor.prototype[i] = prototype[i];
		}

		endpoint[className] = constructor;

	},

	module: function(namespace, module)
	{
		var names = namespace.split('.');
		var moduleName = names.pop();
		var endpoint = this.createNamespace(window, names.join(''));
		endpoint[moduleName] = module;
	},

	extend: function(Child,Parent)
	{
		if (typeof Parent !== 'function')
		{
			Child.superclass = function(){};
			return;
		}

		var F = function() {};
		F.prototype = Parent.prototype;
		Child.prototype = new F();
		Child.prototype.constructor = Child;
		Child.superclass = Parent;

		Object.defineProperty(Child.prototype, 'constructor', { 
		    enumerable: false, 
		    value: Child 
		});
	},

	createNamespace: function( base, string )
	{
	    if (string.length === 0)
	    {
	    	return base;
	    }

	    var parent = base;
	    var names = string.split('.');

	 	for (var i = 0; i < names.length; i++)
	    {
	    	if (typeof parent[names[i]] == 'undefined')
	        {
	            parent[names[i]] = {};
	        }
	 
	        parent = parent[names[i]];
	    }

	    return parent;
	},

	augment: function(receivingClass, givingClass)
	{
	    var methodName;
        for (methodName in givingClass.prototype)
        {
            if (!receivingClass.prototype[methodName])
            {
                receivingClass.prototype[methodName] = givingClass.prototype[methodName];
            }
        }
	},

	mixin: function(constructor, mixins)
	{
		if (mixins.length)
		{
			for(var m = 0; m < mixins.length; m++)
			{
				this.augment(constructor, mixins[m]);
			}
		}
	},

	define2: function(namespace, prototype)
	{
		var names = namespace.split('.');
		var className = names.pop();
		var endpoint = this.createNamespace(window, names.join(''));

		var constructor = prototype._constructor || function(){};
		var mixins = prototype._mixins || [];
		var parent = prototype._extends || null;

		delete prototype._constructor;
		delete prototype._mixins;
		delete prototype._extends;

		this.extend(constructor, parent);

		for (var i in prototype)
		{
			constructor.prototype[i] = prototype[i];
		}

		this.mixin(constructor, mixins);
		
		endpoint[className] = constructor;
	}
}


Vertaxis.define('Movable',null, 
	function Movable(){},
	{
		speed:0,
		acceleration:0,
		move:function(){
			console.log('moveee')
		},
		getPosition: function(){

		}
	}
);

Vertaxis.define('Paintable',null, 
	function Paintable(){

	},
	{
		color: '',
		paint:function(color)
		{
			this.color = color;
		}
	}
);


Vertaxis.define2('Car', 
{
	_mixins: [
		Movable,
		Paintable
	],

	_constructor: function Car(model)
	{
		this.model = model || 'TAZ';
	},
	
	engine: 'v8'

});
