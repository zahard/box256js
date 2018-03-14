var resources = [
    'Layer',
    'KeyboardManager',
    'levels',
    'actionsBuffer',
    'memory',
    'codeEditor',
    'boxMemory',
    'ViewRender',
    'ScreenRender',
    'commandList',
    'CommandManager',
    'box256'
];

for (var i = 0; i < resources.length; i++)
{
    document.write('<script type="text/javascript" src="js/'+resources[i]+'.js"></script>');
}

