var html = require('nanohtml')

var handler = isTouchDevice ? 'ontouchstart' : 'onmousedown'

html`
  <div id="halp" ${handler}=${() => {}} />
`

var className = 'className'
html`
  <div id="str" ${className}="blub" />
`

var x = { disabled: 'disabled' }
html`
  <button ${x} id="lol" />
`
x = {}
html`<button ${x} id="abc" />`
