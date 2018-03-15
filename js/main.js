var resources = [
    'Layer',
    'levels',
    'button',
    'actionsBuffer',
    'memory',
    'commandList',
    'commandCompiler',
    'commandRunner',
    'codeEditor',
    'boxMemory',
    'viewRender',
    'screenRender',
    'box256'
];

for (var i = 0; i < resources.length; i++)
{
    document.write('<script type="text/javascript" src="js/'+resources[i]+'.js"></script>');
}

