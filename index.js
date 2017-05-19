// See https://github.com/shuhei/pelo/issues/5
var isElectron = require('is-electron')
var browser = require('./browser')

if (typeof window !== 'undefined' && isElectron()) {
  module.exports = browser
} else {
  module.exports = stringify
}

function handleValue (value) {
  if (Array.isArray(value)) {
    // Suppose that each item is a result of html``.
    return value.join('')
  }
  // Ignore event handlers.
  //     onclick=${(e) => doSomething(e)}
  // will become
  //     onclick=""
  if (typeof value === 'function') {
    return '""'
  }
  if (value === null || value === undefined) {
    return ''
  }
  if (value.__encoded) {
    return value
  }
  var str = value.toString()
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function stringify () {
  var pieces = arguments[0]
  var output = ''
  for (var i = 0; i < pieces.length; i++) {
    output += pieces[i]
    if (i < pieces.length - 1) {
      output += handleValue(arguments[i + 1])
    }
  }
  // HACK: Avoid double encoding by marking encoded string
  // You cannot add properties to string literals
  // eslint-disable-next-line no-new-wrappers
  var wrapper = new String(output)
  wrapper.__encoded = true
  return wrapper
}
