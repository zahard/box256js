var resources = [
    'Layer',
    'KeyboardManager',
    'memory',
    'BoxMemory',
    'ViewRender',
    'ScreenRender',
    'CommandManager',
    'application'
];

for (var i = 0; i < resources.length; i++)
{
    document.write('<script type="text/javascript" src="js/'+resources[i]+'.js"></script>');
}

