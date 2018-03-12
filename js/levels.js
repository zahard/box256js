
(function(){

})()

var getLevels = (function() {
  var levels = [];
  var l1 = new Array(16).fill('0000000000000000');
  l1[2] = '0011111111111100';
  l1[13] = '0011111111111100';
  for (var i=3;i < 13;i++) {
    l1[i] = '0010000000000100';
  }
  levels.push(l1.join(''));

  var l2 = new Array(16).fill('0000000000000000');
  l2[2] = '00EEEEEEEEEEEE00';
  l2[3] = '00EEEEEEEEEEEE00';
  l2[12] = '00EEEEEEEEEEEE00';
  l2[13] = '00EEEEEEEEEEEE00';
  for (var i=4;i < 12;i++) {
    l2[i] = '00EE00000000EE00';
  }
  levels.push(l2.join(''));

  var l3 = []
  for(var i=0; i< 8; i++)  {
    l3.push('2323232323232323');
    l3.push('3232323232323232');
  }
  levels.push(l3.join(''));

  var l4 = []
  for(var i=0; i< 4; i++)  {
    l4.push('11cc11cc11cc11cc');
    l4.push('11cc11cc11cc11cc');
    l4.push('cc11cc11cc11cc11');
    l4.push('cc11cc11cc11cc11');
  }
  levels.push(l4.join(''));

  var l5 = new Array(256).fill('0')
  var x = 0;
  var y = 0;
  var colors = ['8', '9', 'A', 'B'];
  for (var i=0; i< 4; i++)  {
    for (var j=0; j< 4; j++)  {
      x = i * 4 + j;
      y =  i * 4 ;
      if (j==0 || j == 3) {
        for (var sy=0; sy< 4; sy++)  {
          l5[x + (y + sy) * 16] = colors[i];
        }
      } else {
        l5[x + y * 16] = colors[i];
        l5[x + (y +3) * 16] = colors[i];
      }
    }
  }
  levels.push(l5.join(''));

  function repeat(str, n) {
    return new Array(n).fill(str).join('')
  }

  var l6 = ''
  l6 += repeat('8888888800000000', 8);
  l6 += repeat('0000000099990000', 4);
  l6 += repeat('000000000000AA00', 2);
  l6 += '00000000000000B0'
  l6 += '0000000000000000'
  levels.push(l6);

  function diagonal(arr, x, color) {
    var y, pos, rev;
    for(var i=0; i < 16;i++) {
      y = i * 16;
      pos = x + y;
      arr[pos] = color;

      //reversed
      rev = (15-x) + ((15-i) * 16)
      arr[rev] = color;

      x--;
      if (x < 0) {
        break
      }
    }
  }

  var l7 = new Array(256).fill('1');
  diagonal(l7, 0, '2');
  diagonal(l7, 2, '3');
  diagonal(l7, 3, '4');
  diagonal(l7, 6, '4');
  diagonal(l7, 7, '3');
  diagonal(l7, 9, '4');
  diagonal(l7, 12, '4');
  diagonal(l7, 15, '2');

  levels.push(l7.join(''));

  var l8 = '3BBB';
  l8 += repeat('3B333B3BBB', 25)
  l8 += '3B';
  levels.push(l8);


  var l9 = new Array(16);
  l9.push('8000000000000000');
  l9.push('8800000000000000');
  l9.push('8080000000000000');
  l9.push('8888000000000000');
  l9.push('8000800000000000');
  l9.push('8800880000000000');
  l9.push('8080808000000000');
  l9.push('8888888800000000');
  l9.push('8000000080000000');
  l9.push('8800000088000000');
  l9.push('8080000080800000');
  l9.push('8888000088880000');
  l9.push('8000800080008000');
  l9.push('8800880088008800');
  l9.push('8080808080808080');
  l9.push('8888888888888888');
   levels.push(l9.join(''));


   var l10 = new Array(16);
  l10.push('1000000000000000');
  l10.push('1100000000000000');
  l10.push('1C10000000000000');
  l10.push('1111000000000000');
  l10.push('1CCC100000000000');
  l10.push('11CC110000000000');
  l10.push('1C1C1C1000000000');
  l10.push('1111111100000000');
  l10.push('1CCCCCCC10000000');
  l10.push('11CCCCCC11000000');
  l10.push('1C1CCCCC1C100000');
  l10.push('1111CCCC11110000');
  l10.push('1CCC1CCC1CCC1000');
  l10.push('11CC11CC11CC1100');
  l10.push('1C1C1C1C1C1C1C10');
  l10.push('1111111111111111');
   levels.push(l10.join(''));


  return function(index) {
    return levels;
  }
})();
