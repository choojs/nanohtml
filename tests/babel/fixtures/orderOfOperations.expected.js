var _p,
    _div,
    _appendChild = require('nanohtml/lib/append-child');

let i = 0;

const counter = (_div = document.createElement('div'), _appendChild(_div, [' ', i++, ' ', (_p = document.createElement('p'), _appendChild(_p, [i++]), _p), ' ', i++, ' ']), _div);
