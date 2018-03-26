var html = {
  'createElement': require('nanohtml/lib/createElement')
};


var handler = isTouchDevice ? 'ontouchstart' : 'onmousedown';

html.createElement('div', Object.assign({
  'id': 'halp'
}, {
  [handler]: () => {}
}), ['\n']);

var className = 'className';
html.createElement('div', Object.assign({
  'id': 'str'
}, {
  [className]: 'blub'
}), ['\n']);

var x = { disabled: 'disabled' };
html.createElement('button', Object.assign(x, {
  'id': 'lol'
}), ['\n']);
x = {};
html.createElement('button', Object.assign(x, {
  'id': 'abc'
}), []);