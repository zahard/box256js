var resources = [
    'helpers',
    'Vertaxis/Vertaxis',
    'Vertaxis/Math',
    'Vertaxis/Shape',
    'Layer',
    'KeyboardManager',
    'Registry',
    'application'
];  

for (var i = 0; i < resources.length; i++)
{
    document.write('<script type="text/javascript" src="js/'+resources[i]+'.js"></script>');
}

