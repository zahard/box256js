window.onload = function()
{
	window.game = new electroBox(960,640);

}


function electroBox(width, height)
{
	Registry.add('app',this);


	this.width = width;
	this.height = height;

	this.wrapper = $('wrapper');
	this.offsetTop = this.wrapper.offsetTop;
		this.offsetLeft = this.wrapper.offsetLeft;
	
	this.wrapper.style.width = width + 'px';
	this.wrapper.style.height = height + 'px';

	this.layers = {
		background:    new Layer( $('background'), width, height, 1),
		box:    new Layer( $('boxes'), width, height, 3),
		wires:    new Layer( $('wires'), width, height, 2),
		help:    new Layer( $('help'), width, height, 4)
	};

	this.grid = 30;

	this.addListeners();

	this.drawBackground();

	this.drawModules();


}


electroBox.prototype = {
	activePoint: {
		x:0, y:0
	},

	MOUSE_HOLDED: false,

	drawBackground: function(){ 

		this.layers.background.set('fillStyle', '#fff');
		this.layers.background.fillRect(0,0,this.width,this.height)
	
	},
	drawModules: function()
	{
		var ctx = this.layers.box;

		var startY = 75;

		this.DINS =[];
		var DIN1 = {
			x: 150, y : startY,
			modules: [
				new Breaker(40, 2),
				new Voltmeter(),
				null,
				new RSD(16),
				new RSD(16),
				new RSD(16)
			]
		}

		this.DINS.push(DIN1);

		this.drawDIN(ctx, DIN1);

		var DIN2 = {
			x: 150, y : startY + 200,
			modules: [
				null,
				null,
				new Breaker(16, 1), //Hall
				new Breaker(16, 1), //bedroom
				new Breaker(16, 1), // bedroom 2
				new Breaker(16, 1), // Koridor
				new Breaker(16, 1), //Kitchen
				new Breaker(10, 1), //Refrig
				new Breaker(10, 1), //Router
				new Breaker(10, 1), //Light 1
				new Breaker(10, 1), // Light 2
				new Breaker(10, 1), // light 3

			]
		}

		this.DINS.push(DIN2);

		this.drawDIN(ctx, DIN2);

		var DIN3 = {
			x: 150, y : startY + 400,
			modules: [
				null,
				null,
				null,
				null,
				
				new Breaker(16, 1), // k1
				new Breaker(16, 1), // k2
				new Breaker(16, 1), //Owen
				null,
				
				new Breaker(16, 1), //stiralke
				new Breaker(16, 1), //sushuilka
				new Breaker(16, 1),// Boiler
				new Breaker(16, 1), // baccony

				
				
			]
		}

		this.DINS.push(DIN3);

		this.drawDIN(ctx, DIN3);

		var color = {
			blue: '#257ffa',
			red: '#ea2f2f',
			green: 'green'
		}


		this.connectNext(
			[DIN1.modules[0], 'bottom', 0],
			[DIN1.modules[1], 'bottom', 0],
			'#333'
		);

		this.connectWithBus(DIN1, 6, 6)
		
		this.connectNext(
			[DIN1.modules[1], 'bottom', 2],
			[DIN1.modules[3], 'top', 1],
			'#333'
		);
		

		this.connectBottom(
			[DIN1.modules[3], 'bottom', 1],
			[DIN3.modules[6], 'top', 0],
			color.red
		);

		this.connectBottom(
			[DIN1.modules[4], 'bottom', 1],
			[DIN3.modules[8], 'top', 0],
			color.red
		);
		

		this.connectBottom(
			[DIN1.modules[5], 'bottom', 1],
			[DIN2.modules[11], 'top', 0],
			color.red
		);


		this.connectWithBus(DIN2, 2, 10)
		this.connectWithBus(DIN3, 8, 4)
		this.connectWithBus(DIN3, 4, 3)

		



		return;
	},

	connectBottom: function (from, to, color)
	{
		var ctx = this.layers.wires;
		ctx.set('lineWidth', 5);
		ctx.set('strokeStyle', color);
		//ctx.set('lineCap', 'round');

		var a1 = from[0].clemsPos[from[1]][from[2]];
		var a2 = to[0].clemsPos[to[1]][to[2]];

		var b1 = {
			x:a1.x,
			y:a1.y
		}
		var b2 = {
			x:a2.x,
			y:a2.y
		}


		b1.y += this.grid/4;
		b2.y -= this.grid/4;

	
		var c1 = {
			x: b1.x,
			y: b2.y
		}

		var c2 = {
			x: b2.x,
			y: b1.y
		}

		var dx = b1.x - b2.x;
		var dy = b1.y - b2.y;	
		c1.y += dy/3;
		c2.y -= dy/3;

		ctx.beginPath();
		ctx.moveTo(b1.x, b1.y);
		ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y,b2.x, b2.y);
		ctx.stroke();

		this.drawConnector(ctx, b1, from[1]);
		this.drawConnector(ctx, b2, to[1]);

	},

	drawConnector: function(ctx, p, type)
	{	
		//ctx.set('fillStyle', '#9a9752');
		var y;
		if(type == 'bottom') {
			y = p.y
		} else {
			y = p.y - 7
		}
		console.log(y, type)
		ctx.set('fillStyle','#333')
		ctx.fillRect(p.x-5, y, 10, 7);
		ctx.set('fillStyle','#fff')
		if(type == 'bottom'){
			ctx.fillRect(p.x-5+2, y, 6, 5);
		} else {
			ctx.fillRect(p.x-5+2, y+2, 6, 5);
		}
	},

	connectWithBus: function(din, from, slots)
	{
		var ctx = this.layers.wires;
		var slot = 0;
		var module;
		var startClemm;
		for (var i=0; i<din.modules.length;i++)
		{
			if(din.modules[i] === null)
			{
				slot += 1;
				continue;
			}


			var moduleSlots = din.modules[i].usedSlots;

			if(slot <= from && from < slot + moduleSlots)
			{
				module = din.modules[i];
				startClemm = slot - from;
				break;
			} else {
				slot += moduleSlots;
			}
		}


		if(!module)  return;

		var a1 = module.clemsPos['top'][startClemm];
		if(!a1) return;
		var b1 = {x:a1.x, y:a1.y};

		var ctx = this.layers.wires;


		ctx.set('lineWidth', 8);
		ctx.set('strokeStyle', '#C87533');
		
		for(var i = 0; i < slots; i++)
		{
			var x = b1.x + this.grid * i;
			ctx.beginPath();
			ctx.moveTo(x, b1.y);
			ctx.lineTo(x, b1.y - 20);
			ctx.stroke();
		}

		ctx.beginPath();
		ctx.moveTo(b1.x - 4, b1.y - 20);
		ctx.lineTo(b1.x + this.grid * (slots - 1) + 4, b1.y - 20);
		ctx.stroke();


	},

	connectNext: function(from, to, color)
	{	
		var ctx = this.layers.wires;
		ctx.set('lineWidth', 5);
		ctx.set('strokeStyle', color);
		//ctx.set('lineCap', 'round');


		var a1 = from[0].clemsPos[from[1]][from[2]];
		var a2 = to[0].clemsPos[to[1]][to[2]];

		var b1 = {x:a1.x, y:a1.y};
		var b2 = {x:a2.x, y:a2.y};

		

		if(from[1] != to[1])
		{
			b1.y += this.grid / 4;
			b2.y -= this.grid / 4;

			var d = (b2.x - b1.x) / 2 - 10;
			y = b1.y;
			ctx.beginPath();
			ctx.moveTo(b1.x, y);
			ctx.bezierCurveTo(b1.x, y + this.grid,  b1.x + d, y + this.grid,   b1.x + d, y)
			ctx.stroke();
			y = b2.y;
			ctx.beginPath();
			ctx.moveTo(b2.x, y);
			ctx.bezierCurveTo(b2.x, y - this.grid,  b2.x - d, y - this.grid,   b2.x - d, y)
			ctx.stroke();


			ctx.beginPath();
			ctx.moveTo(b1.x + d, b1.y);
			ctx.lineTo(b2.x - d, b2.y)
			ctx.stroke();

		}
		else
		{
			if(from[1] == 'bottom') {
				b1.y += this.grid / 4;
				b2.y += this.grid / 4;
				var c1 = {
					x: b1.x,
					y: b1.y + this.grid
				}

				var c2 = {
					x: b2.x,
					y: b2.y + this.grid 
				}

			}
			else
			{
				b1.y -= this.grid / 4;
				b2.y -= this.grid / 4;

				var c1 = {
					x: b1.x,
					y: b1.y - this.grid
				}

				var c2 = {
					x: b2.x,
					y: b2.y - this.grid 
				}
			}
			

			var dy = b1.y - b2.y;	
			c1.y += dy/3;
			c2.y -= dy/3;
			
			ctx.beginPath();
			ctx.moveTo(b1.x, b1.y);
			ctx.bezierCurveTo(c1.x, c1.y,c2.x,c2.y, b2.x, b2.y)
			ctx.stroke();
		}

		this.drawConnector(ctx, b1, from[1]);
		this.drawConnector(ctx, b2, to[1]);
	},

	drawDIN: function(ctx,din)
	{
		var moduleHeight  = this.grid*3;
		var h = this.grid *1.5;
		var w = this.grid * 14;
		ctx.set('fillStyle', '#d0cc69');
		ctx.fillRect(din.x, din.y +(moduleHeight-h)/2 , w, h);
		ctx.set('fillStyle', '#9a9752');
		ctx.fillRect(din.x, din.y +(moduleHeight-h)/2 , w, 2);
		ctx.fillRect(din.x, din.y +(moduleHeight-h)/2 + h -2 , w, 2);

		ctx.set('fillStyle', '#eee');
		ctx.beginPath();
		ctx.arc(din.x+this.grid/2, din.y +(moduleHeight-h), 5,  rad(0) , rad(360), false );
		ctx.stroke();
		ctx.fill();

		ctx.beginPath();
		ctx.arc(din.x+ this.grid*13 + this.grid/2, din.y +(moduleHeight-h), 5,  rad(0) , rad(360), false );
		ctx.stroke();
		ctx.fill();


		var offset = this.grid;
		var module;
		for (var i=0;i <din.modules.length;i++)
		{
			module = din.modules[i];
			if(!module || module === null)
			{
				offset += this.drawEmptySlot()
			} else {
				offset += module.draw(ctx, {x:din.x + offset, y:din.y})
			}			
		}
		
	},

	drawEmptySlot: function ()
	{
		return this.grid;
	},

	addListeners: function()
	{	
		var kb;
		this.kb = kb = new KeyboardManager(this);

		window.addEventListener('resize', function(){
			this.onResize();
		}.bind(this), false);

		this.wrapper.addEventListener('mousedown',function(e) {
			this.updateActivePoint(e);
		}.bind(this));

		this.wrapper.addEventListener('click',function(e) {
			this.click();
		}.bind(this));

	},

	click: function()
	{
		var p = this.activePoint;
		var module;

		//Search correct module
		for(var i=0;i<this.DINS.length;i++)
		{
			var din = this.DINS[i];
			if( p.y >= din.y && p.y <= din.y + this.grid*3 && p.x > din.x + this.grid && p.x < din.x + this.grid * 13)
			{
				
				var moduleNumber = Math.floor((p.x - din.x - this.grid) / this.grid);

				var slot = 0;
				var module;
				for(var j=0;j<din.modules.length;j++)
				{
					if(din.modules[j] !== null)
					{
						var takenSlots = din.modules[j].usedSlots;
						if(moduleNumber >= slot && moduleNumber < takenSlots+slot){
							module = din.modules[j];
							break;
						} else {
							slot += takenSlots;
						}
					} else {
						slot += 1;
					}

				}
			}

			if(module) {
				break;
			}
		}

		if(module) {
			module.on = ! module.on;
			module.redraw();
		}
	},

	updateActivePoint: function(e)
	{
		//Calculate ratio to allow resize canvas and keep track right mouse position related canvas
		var ratioX = this.wrapper.clientWidth / this.width;
		var ratioY = this.wrapper.clientHeight / this.height;
		this.activePoint.x =  Math.floor( (e.pageX - this.offsetLeft) / ratioX);
		this.activePoint.y =  Math.floor( (e.pageY - this.offsetTop)  / ratioY);
	},

	onResize: function()
	{

		
		this.offsetTop = this.wrapper.offsetTop;
		this.offsetLeft = this.wrapper.offsetLeft;

	}
}