
function Pallete () {
  // Application colors
  var colors = [
      { name: 'black', value: '#111111'},
      { name: 'blue', value: '#354367'},
      { name: 'bordo', value: '#6c3652'},
      { name: 'green', value: '#4f7f58'},

      { name: 'brick', value: '#965b46'},
      { name: 'grey', value: '#5d5751'},
      { name: 'silver', value: '#c2c3c7'},
      { name: 'white', value: '#fefefe'},

      { name: 'red', value: '#d74f5e'},
      { name: 'orange', value: '#e7a856'},
      { name: 'yellow', value: '#fef877'},
      { name: 'lightgreen', value: '#6ddd64'},

      { name: 'lightblue', value: '#6baef1'},
      { name: 'purple', value: '#7f7a97'},
      { name: 'pink', value: '#df8ba9'},
      { name: 'cream', value: '#f0ceb4'}
  ];

  // Colors indexes
  this.colors = {};
  // Names by index
  this.indexColors = [];

  for (let i = 0; i < colors.length; i++) {
    let info = colors[i];
    this[info.name] = info.value;
    this.colors[info.name] = i;
    this.indexColors.push(info.name);
  }

  const instance = this;
  Pallete = function () { return instance };
}
