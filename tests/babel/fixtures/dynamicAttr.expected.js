var _halp,
    _str,
    _lol,
    _abc,
    _setAttribute = require('nanohtml/lib/set-attribute');

var handler = isTouchDevice ? 'ontouchstart' : 'onmousedown';

_halp = document.createElement('div'), _halp.setAttribute('id', 'halp'), _setAttribute(_halp, handler, () => {}), _halp.appendChild(document.createTextNode('\n')), _halp;

var className = 'className';
_str = document.createElement('div'), _str.setAttribute('id', 'str'), _setAttribute(_str, className, 'blub'), _str.appendChild(document.createTextNode('\n')), _str;

var x = 'disabled';
_lol = document.createElement('button'), _setAttribute(_lol, x, x), _lol.setAttribute('id', 'lol'), _lol.appendChild(document.createTextNode('\n')), _lol;
x = '';
_abc = document.createElement('button'), _setAttribute(_abc, x, x), _abc.setAttribute('id', 'abc'), _abc;
