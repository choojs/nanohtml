var _div,
    _appendChild = require('nanohtml/lib/append-child');

_div = document.createElement('div'), _appendChild(_div, ['\n    ', document.createComment(' important comment text '), '\n  ']), _div;