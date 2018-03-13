var _appendChild = require('nanohtml/lib/append-child');

var element = void 0;
if (someCondition) {
  var _h;

  element = (_h = document.createElement('h1'), _appendChild(_h, ['Warning!']), _h);
}
document.body.appendChild(someCondition);