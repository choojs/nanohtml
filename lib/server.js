module.exports = nanothtmlServer

function nanothtmlServer (src, filename, options, done) {
  if (typeof src === 'string' && !/\n/.test(src) && filename && filename._flags) {
    var args = Array.prototype.slice.apply(arguments)
    return require('./browserify-transform.js').apply(this, args)
  }

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

function handleValue (value) {
  // Suppose that each item is a result of html``.
  if (Array.isArray(value)) return value.join('')

  // Ignore event handlers. `onclick=${(e) => doSomething(e)}`
  // will become.           `onclick=""`
  if (typeof value === 'function') return '""'
  if (value === null || value === undefined) return ''
  if (value.__encoded) return value
  var str = value.toString()
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
