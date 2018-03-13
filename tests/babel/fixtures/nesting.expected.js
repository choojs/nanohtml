var _b,
    _a,
    _appendChild = require('nanohtml/lib/append-child');

_a = document.createElement('div'), _a.setAttribute('class', 'a'), _appendChild(_a, ['\n    ', (_b = document.createElement('div'), _b.setAttribute('class', 'b'), _b.appendChild(document.createTextNode('\n  ')), _b), '\n']), _a;