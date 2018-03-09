var _div,
    _appendChild = require('nanohtml/lib/append-child');

_div = document.createElement('div'), _appendChild(_div, [' ', document.createComment(' important comment text '), ' ']), _div;