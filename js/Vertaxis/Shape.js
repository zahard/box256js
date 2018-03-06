

Vertaxis.define('Vertaxis.Vector', null, 
	function Vector(x, y)
	{
		this.set(x,y);
	},
	{
		set: function(x,y)
		{ 
			this.x = x;
			this.y = y;
			this.update();
		},

		add: function(vector)
		{
			this.x += vector.x;
			this.y += vector.y;
			this.update();
		},

		update: function()
		{
			this.magnitude = Math.sqrt(this.x * this.x + this.y * this.y);
			this.angle = Math.atan2(this.y,this.x);
		},

		getMagnitude: function ()
		{
			return this.magnitude;
		},

		getAngle: function ()
		{
			return this.angle;
		}
	}
);


Vertaxis.define('Vertaxis.Shape', null, function Shape()
{
	
},
{

});


Vertaxis.define('Vertaxis.Box', Vertaxis.Shape, 
	function Boxy(cxt, x, y, width, height, angle)
	{
		Vertaxis.Box.superclass.apply(this,arguments);
		

		this.cxt = cxt;
		this.width = width;
		this.height = height;
		this.square = this.width * this.height;

		this.radius = Math.sqrt(this.width * this.width  + this.height * this.height) / 2;

		//this.size = size;
		this.halfW = this.width / 2;
		this.halfH = this.height / 2;

		if(angle)
		{
			this.angle = Vertaxis.Math.rad(angle);
		}
		else
		{
			this.angle = 0;
		}

		this.moveTo(x,y);

	},
	{	
		type: 'rect',
		tangSpeed: 0,
		draw: function()
		{
			this.cxt.beginPath();
			this.cxt.moveTo(
				this.vertex[3].x,
				this.vertex[3].y
			);

			for(var i = 0; i < 4; i++)
			{
				this.cxt.lineTo(
					this.vertex[i].x,
					this.vertex[i].y
				);
			}

			this.cxt.lineTo(
				this.vertex[1].x,
				this.vertex[1].y
			);

			this.cxt.moveTo(
				this.vertex[0].x,
				this.vertex[0].y
			);

			this.cxt.lineTo(
				this.vertex[2].x,
				this.vertex[2].y
			);

			var top = {
				x: (this.vertex[0].x + this.vertex[1].x) / 2,
				y: (this.vertex[0].y + this.vertex[1].y) / 2
			}

			this.cxt.moveTo(this.x,this.y);
			this.cxt.lineTo(top.x, top.y);

			this.cxt.set('strokeStyle','#fff');
			this.cxt.closePath();
			this.cxt.stroke();

		},

		moveTo: function(x,y,angle)
		{
			this.x = x;
			this.y = y;
			if (angle)
			{
				this.angle = angle;
			}

			this.updateVertex();
		},

		mv: function(x,y,a)
		{
			this.x += x;
			this.y += y;
			this.angle += Vertaxis.Math.rad(a);
			this.updateVertex();
			window.game.drawBoxes();
		},

		move: function(dx,dy)
		{
			this.x += dx;
			this.y += dy;
			this.x = Math.round(this.x);
			this.y = Math.round(this.y);

			this.updateVertex();
		},

		updateVertex: function(fixVertex)
		{
			this.calculateVertex();
			if (this.angle != 0 )
			{
				this.translateVertex(fixVertex);
			}
		},

		rotateAroundPoint: function(angle, point, t)
		{
			var fixVertex;
			var center = Vertaxis.Math.rotatePoint({x:this.x,y:this.y}, angle, point);

			this.x = center.x;
			this.y = center.y;
			this.angle += angle;

			var min_d = 0.008;
			var sign = Vertaxis.Math.sign(this.angle);
			var a = Math.abs(this.angle) % Math.PI/2;
			if( a - 0 < min_d){
				this.angle = sign * Math.round( Math.abs(this.angle) / (Math.PI/2) ) * Math.PI/2;
			}

			for(var i = 0; i < this.vertex.length; i++)
			{
				//Fix this vertex
				if(point.x == this.vertex[i].x && point.y == this.vertex[i].y)
				{
					fixVertex = {
						n: i,
						point: point
					}
				}
			}

			this.updateVertex(fixVertex);

		},

		setAngle: function(angle)
		{
			this.angle = Vertaxis.Math.rad(angle);
			this.updateVertex();
		},

		calculateVertex: function()
		{
			var x1 = this.x - this.halfW;
			var x2 = this.x + this.halfW;
			var y1 = this.y - this.halfH;
			var y2 = this.y + this.halfH;

			this.vertex = [
				{ x: x1, y: y1},
				{ x: x2, y: y1},
				{ x: x2, y: y2},
				{ x: x1, y: y2}
			];		
		},

		translateVertex: function(fixVertex)
		{
			var rotationPoint = {x: this.x, y: this.y};
			var vl = this.vertex.length;
			for(var i = 0; i < vl; i++)
			{
				this.vertex[i] = Vertaxis.Math.rotatePoint(this.vertex[i], this.angle, rotationPoint);
			}

			if (fixVertex)
			{
				this.vertex[fixVertex.n] = { x: fixVertex.point.x, y: fixVertex.point.y };
			}
		},

		collideWith: function(shape)
		{
			if (this.distanceToCenter(shape) > this.radius + shape.radius)
			{
				return false;
			}

			if (shape.type == 'circle')
			{
				return this.collideWithCircle(shape);
			}

			if (shape.type == 'rect' && this.type == 'rect' &&
				shape.angle == 0 && this.angle == 0)
			{
				return this.collideOrthogonalWith(shape);
			}

			var figures = [this,shape];
			var figure_a;
			var figure_b;
			var square;
			var v;
			var vl1;
			var vl2;
			var p1, p2;
			var point;
			var triangleSquare;


			for(var n = 0; n < 2; n++)
			{
				figure_a = figures[(n == 0) ? 0 : 1];
				figure_b = figures[(n == 0) ? 1 : 0];
				
				//Shape square calculated be triangles method
				square = 0;
				v = figure_b.vertex;
				for (var i = 0; i < v.length; i++)
				{
					p1 = i;
					p2 = (i < v.length - 1) ? i + 1 : 0;

					square += 1/2 * Math.abs( 
						(v[p2].x - v[p1].x) * (figure_b.y - v[p1].y) - 
						(v[p2].y - v[p1].y) * (figure_b.x - v[p1].x)
					);
				}


				for(var m = 0; m < figure_a.vertex.length; m++)
				{
					//Count squares of 4 triangles
					// generated by point and 4 sides of shape
					point = figure_a.vertex[m];
					
					triangleSquare = 0;
					v = figure_b.vertex;
				
					for (var i = 0; i < v.length; i++)
					{
						p1 = i;
						p2 = (i < v.length - 1) ? (i + 1) : 0;

						triangleSquare += 1/2 * Math.abs(
							(v[p2].x - v[p1].x) * (point.y - v[p1].y) - 
							(v[p2].y - v[p1].y) * (point.x - v[p1].x)
						);
					}

					if (triangleSquare - square < 20) //Small gap 
					{
						this.lastCollision = {
							shape: shape,
							impactType: (n == 0) ? 'vertex' : 'side',
							vertex: m
						}
						return true;
					}
				}

			}

			return false
		},

		collideOrthogonalWith: function(shape)
		{
			if (
				this.x - this.halfW <= shape.x + shape.halfW &&
		        this.x + this.halfW >= shape.x - shape.halfW &&
		        this.y - this.halfH <= shape.y + shape.halfH &&
		        this.y + this.halfH >= shape.y - shape.halfH )
	        {

	        	var segment = [];
	        	if(this.x < shape.x){
	        		if(this.y < shape.y){
	        			segment.push({
	        				x:this.vertex[2].x,
	        				y:this.vertex[2].y
	        			},
	        			{
	        				x:shape.vertex[0].x,
	        				y:shape.vertex[0].y
	        			})
	        		}	
	        	}

	        	this.lastCollision = {
					shape: shape,
					impactType: 'orto',
					segment: segment
				}
	        	return true;
	        }
			return false;
		},

		collideWithCircle: function(circle)
		{
			var center = {x:circle.x, y: circle.y};
			var r = circle.radius;

			//First check vertexes for belonging to circle
			var vertexesInCircle = [];
			for (var i =0; i < this.vertex.length;i++)
			{	
				//If disatnce from cetner to point is less that radius
				//this point are belong to circle
				if( Vertaxis.Math.distance(circle, this.vertex[i]) <= r)
				{
					vertexesInCircle.push(i);
				}
			}

			//If we have vertexes in circle that mean that shapes are intersected
			if (vertexesInCircle.length > 0)
			{
				this.lastCollision = {
					shape: circle,
					impactType: 'vertex',
					vertex:	vertexesInCircle			
				}
				return true;
			}
			
			//Check all sidex of polygon for intersect with circle
			var s1, s2,a, b;
			for (var i = 0; i < this.vertex.length; i++)
			{
				s1 = i;
				s2 = (i < this.vertex.length - 1) ? i + 1 : 0;

				//Tranalsate points to local plane
				a = Vertaxis.Math.translatePoint(this.vertex[s1], center);
				b = Vertaxis.Math.translatePoint(this.vertex[s2], center);

				
				var dx = b.x - a.x;
				var dy = b.y - a.y;

				var dr = Math.sqrt(dx*dx + dy*dy);
				var dr2 = dx*dx + dy*dy;

				var D = (a.x * b.y) - (b.x * a.y);
				var DD = Math.pow(r, 2) * dr2 - Math.pow(D, 2) 
			
				if (DD >= 0)
				{
					//POints of circle and line intersection
					var dt = Math.sqrt( DD );

					var x = Math.round( (  D * dy - ((dy < 0) ? -1 : 1) * dx * dt ) / dr2 );
					var y = Math.round( (- D * dx - Math.abs(dy) * dt ) / dr2 );
					var p1 = Vertaxis.Math.translatePoint({x:x, y:y}, center, true);

					var x = Math.round( (  D * dy + ((dy < 0) ? -1 : 1) * dx * dt ) / dr2 );
					var y = Math.round( (- D * dx + Math.abs(dy) * dt ) / dr2 );
					var p2 = Vertaxis.Math.translatePoint({x:x,y:y}, center, true);

					var points = [p1,p2];
					// INtersection appear if point of line and circle intersection
					// lie on the segment [a,b]
					if( Vertaxis.Math.isPointOnSegment(p1,a,b) ||
						Vertaxis.Math.isPointOnSegment(p2,a,b) )
					{
						this.lastCollision = {
							shape: circle,
							impactType: 'side',
							side: [a,b]
						}
						return true;
					}
				}
			}

			//If there are nso insterseptions with all sides return false
			return false;
		},

		distanceToCenter: function(shape)
		{
			return Vertaxis.Math.distance(this,shape);
		},

		impact: function(cb,speed)
		{

			this.rotationCenter  = null;
			this.speed = 0;
			this.speedX = 0;
			this.tangSpeed = 0;

			var shape = this.lastCollision.shape;
			var type = this.lastCollision.impactType;

			//if (this.angle != shape.angle)
			if ( Math.abs( Math.abs(this.angle % (Math.PI/2)) - Math.abs(shape.angle % (Math.PI/2) )  > Math.PI/360 ) )
			{
				if( type == 'vertex')
				{
					//Vertex touching on side of shape
					//We need rotate object to fit shape angle

					var angle_diff = shape.angle - this.angle;

					var n_angle = this.angle % (Math.PI/2);
					var n_angle_shape = shape.angle % (Math.PI/2);

					var diff = (n_angle - n_angle_shape) % (Math.PI/2)

					var sign = Vertaxis.Math.sign(diff);
					var acc = 0;
					if(diff < Math.PI/4)
					{
						acc = -6 * sign;
					}
					else if(diff > Math.PI/4 || Math.random() > 0.5){
						acc = 6 * sign;
					}else{
						acc = 6 * sign;
					}
					
					this.rotationPoint = this.vertex[this.lastCollision.vertex];
					this.tangAcc = acc;
				}
				else if(type == 'side')
				{
					var v = shape.vertex[this.lastCollision.vertex];
					var p1,p2,a,b;
					//Find what side this point collide

					/*
					var closestSide = null
					for(var i = 0 ; i < this.vertex.length; i++)
					{
						p1 = i;
						p2 = (i < this.vertex.length - 1) ? (i + 1) : 0;
						a = this.vertex[p1];
						b = this.vertex[p2];
						
						var dist = Vertaxis.Math.disatanceToSegment(v, a, b);
						if (!closestSide || closestSide.dist > dist)
						{
							closestSide = { dist: dist, side: [p1,p2]}
						}
					}*/

					var impactPoint = {
						x:v.x,
						y:v.y 
					};
					//TODO
					this.rotationPoint = impactPoint;

					var acc = 6;
					if(impactPoint.x > this.x)
					{
						acc = -6;
					}

					/*
					var angle_diff = shape.angle - this.angle;

					var n_angle = this.angle % (Math.PI/2);
					var n_angle_shape = shape.angle % (Math.PI/2);

					var diff = (n_angle - n_angle_shape) % (Math.PI/2)

					var sign = Vertaxis.Math.sign(diff);
					var acc = 0;
					if(diff < Math.PI/4)
					{
						acc = -3 * sign;
					}
					else if(diff > Math.PI/4 || Math.random() > 0.5){
						acc = 3 * sign;
					}else{
						acc = -3 * sign;
					}
					*/

					this.tangAcc = acc;
				}

			}
			else 
			{
				if( this.lastCollision.segment )
				{

					if (this.x < this.lastCollision.segment[1].x &&
						this.x < this.lastCollision.segment[0].x 
						) 
					{
						var point = this.lastCollision.segment[1];

						this.rotationCenter = {
							x: this.x - point.x,
							y: this.y - point.y
						}

						console.log("BOOM");

						this.tangAcc = 0;
						this.tangSpeed = -15;
						this.speed = 0;
						this.speedX = -10;
						this.accX = 2;
						
					}
				}

			}

			
		}
	}
);


Vertaxis.define('Vertaxis.Circle', Vertaxis.Box,
	function Circle(cxt, x, y, radius, angle)
	{
		//Vertaxis.Circle.superclass.apply(this,arguments);
		

		this.cxt = cxt;
		this.width = radius*2;
		this.height = radius*2;
		this.radius = radius;
		this.square = Math.PI * this.radius * this.radius;

		if(angle)
		{
			this.angle = Vertaxis.Math.rad(angle);
		}
		else
		{
			this.angle = 0;
		}

		this.moveTo(x,y);
	},
	{
		type: 'circle',
		draw: function()
		{
			this.cxt
				.save()
				.beginPath()
				.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false)
				.closePath()
				.set('strokeStyle','#fff')
				.stroke();

			var top = {
				x: this.x,
				y: this.y - this.radius
			};

			var topRotated = Vertaxis.Math.rotatePoint(top, this.angle, this);

			this.cxt
				.beginPath()
				.moveTo(topRotated.x, topRotated.y)
				.lineTo(this.x, this.y)
				.closePath()
				.set('strokeStyle','#fff')
				.stroke();
		},

		updateVertex: function()
		{
			//empty because circle have no vertexes
		}
	}
);



Vertaxis.define('Vertaxis.Triangle', Vertaxis.Box,
	function Triangle(cxt, x, y, size, angle)
	{
		//Vertaxis.Circle.superclass.apply(this,arguments);
		

		this.cxt = cxt;
		//this.radius = radius;

		this.size = size;
		
		this.radius = size / Math.sqrt(3);

		if(angle)
		{
			this.angle = Vertaxis.Math.rad(angle);
		}
		else
		{
			this.angle = 0;
		}

		this.moveTo(x,y);
	},
	{
		type: 'triangle',
		draw: function()
		{
			this.cxt.beginPath();
			this.cxt.moveTo(
				this.vertex[2].x,
				this.vertex[2].y
			);

			for(var i = 0; i < 3; i++)
			{
				this.cxt.lineTo(
					this.vertex[i].x,
					this.vertex[i].y
				);
			}

			this.cxt.set('fillStyle','#fff');
			this.cxt.closePath();
			this.cxt.stroke();
			
		},

		calculateVertex: function()
		{
			var center = {x: this.x, y: this.y};
			var v1 = {
				x: this.x,
				y: this.y - this.radius
			};
			var v2 = Vertaxis.Math.rotatePoint(v1, 2 * Math.PI / 3, this);
			var v3 = Vertaxis.Math.rotatePoint(v1, 4 * Math.PI / 3, this);
			this.vertex = [v1, v2, v3];
		}
	}
);



