var _button,
    _appendChild = require('nanohtml/lib/append-child');

_button = document.createElement('button'), _button.onclick = event => {
  console.log(event);
}, _appendChild(_button, ['\n']), _button;