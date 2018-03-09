var _h,
    _div,
    _i,
    _appendChild = require('nanohtml/lib/append-child'); // The example from the https://github.com/substack/hyperx readme,
// but with bel.


var title = 'world';
var wow = [1, 2, 3];

var tree = (_div = document.createElement('div'), _appendChild(_div, [' ', (_h = document.createElement('h1'), _h.setAttribute('y', 'ab' + String(1 + 2) + 'cd'), _appendChild(_h, ['hello ', title, '!']), _h), ' ', (_i = document.createElement('i'), _i.appendChild(document.createTextNode('cool')), _i), ' wow ', wow.map(function (w) {
  var _b;

  return _b = document.createElement('b'), _appendChild(_b, [w]), _b;
}), '\n']), _div);

console.log(tree.outerHTML);
