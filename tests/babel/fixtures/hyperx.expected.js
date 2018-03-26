var html = {
  'createElement': require('nanohtml/lib/createElement')
};


var title = 'world'; // The example from the https://github.com/substack/hyperx readme,
// but with bel.

var wow = [1, 2, 3];

var tree = html.createElement('div', {}, ['\n  ', html.createElement('h1', {
  'y': 'ab' + (1 + 2) + 'cd'
}, ['hello ', title, '!']), '\n  ', html.createElement('i', {}, ['cool']), '\n  wow\n  ', wow.map(function (w) {
  return html.createElement('b', {}, [w]);
}), '\n']);

console.log(tree.outerHTML);