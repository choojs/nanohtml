var html = require('choo/html')

var element = html``
if (someCondition) {
  element = html`<h1>Warning!</h1>`
}
document.body.appendChild(someCondition)

