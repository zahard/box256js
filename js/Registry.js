
var Registry = new GameRegistry();

function GameRegistry()
{
    var freeIndex = 0;

    this.objects = {};

    this.add = function()
    {
        var index, obj;
        if (arguments.length == 0)
        {
            return false;
        }
        else if (arguments.length == 1)
        {
            freeIndex++;
            index = freeIndex;
            obj = arguments[0];
        }
        else if(arguments.length == 2)
        {
            index = arguments[0];
            obj = arguments[1];
        }
        
        this.objects[index] = obj;
        return index;
    }

    this.get = function(index)
    {
        if(typeof this.objects[index] !== 'undefined')
        {
            return this.objects[index];
        }
        return null;
    }

    this.remove = function(index)
    {
        if(typeof this.objects[index] !== 'undefined')
        {
            delete this.objects[index];
            return true;
        }
        return false;
    }

    var self = this;
    Registry = function(){
        return self;
    }
}

