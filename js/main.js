var resources = [
    'Layer',
    'levels',
    'button',
    'pallete',
    'actionsBuffer',
    'memory',
    'commandList',
    'commandCompiler',
    'commandRunner',
    'codeEditor',
    'memoryBox',
    'view',
    'screen',
    'box256'
];

for (var i = 0; i < resources.length; i++) {
    document.write('<script type="text/javascript" src="js/'+resources[i]+'.js"></script>');
}

window.onload = function() {
  // Start
  window.bx = new Box256(document.getElementById('wrapper'));
};
