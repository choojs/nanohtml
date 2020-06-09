'use strict'

var BOOL_PROPS = require('./bool-props')

var boolPropRx = new RegExp('([^-a-z](' + BOOL_PROPS.join('|') + '))=["\']?$', 'i')
var query = /(?:="|&)[^"]*=$/

module.exports = nanohtmlServer
module.exports.default = module.exports

function nanohtmlServer (src, filename, options, done) {
  if (typeof src === 'string' && !/\n/.test(src) && filename && filename._flags) {
    var args = Array.prototype.slice.apply(arguments)
    return require('./browserify-transform.js').apply(this, args)
  }
  if (typeof src === 'object' && src && src.types && src.template) {
    return require('./babel').apply(this, arguments)
  }

  var boolMatch
  var pieces = arguments[0]
  var values = Array.from(arguments).slice(1).map(unwind)
  var hasPromise = values.some(function wrap (value) {
    if (Array.isArray(value)) return value.some(wrap)
    return isPromise(value)
  }, [])

  if (hasPromise) {
    return Promise.all(values.flat(Infinity)).then(function (values) {
      return nanohtmlServer(pieces, ...values)
    })
  }

  var output = ''
  for (var i = 0; i < pieces.length; i++) {
    var piece = pieces[i]
    if (i < pieces.length - 1) {
      if ((boolMatch = boolPropRx.exec(piece))) {
        output += piece.slice(0, boolMatch.index)
        if (values[i]) {
          output += boolMatch[1] + '="' + boolMatch[2] + '"'
        }
        continue
      }

      var value = handleValue(values[i])
      if (piece[piece.length - 1] === '=' && !query.test(piece)) {
        output += piece + '"' + value + '"'
      } else {
        output += piece + value
      }
    } else {
      output += piece
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
  if (typeof value === 'function') return ''
  if (value === null || value === undefined) return ''
  if (value.__encoded) return value

  if (typeof value === 'object') {
    if (typeof value.outerHTML === 'string') return value.outerHTML
    return Object.keys(value).reduce(function (str, key, i) {
      if (str.length > 0) str += ' '

      if (BOOL_PROPS.indexOf(key) !== -1) {
        if (value[key]) {
          return str + key + '="' + key + '"'
        }
        return str
      }

      var handled = handleValue(value[key])
      return str + key + '="' + handled + '"'
    }, '')
  }

  var str = value.toString()
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function unwind (obj, value) {
  if (isGenerator(obj)) {
    const res = obj.next(value)
    if (res.done) return res.value
    if (isPromise(res.value)) {
      return res.value.then(unwind).then((val) => unwind(obj, val))
    }
    return unwind(obj, res.value)
  } else if (isPromise(obj)) {
    return obj.then(unwind)
  }
  return obj
}

function isPromise (obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'
}

function isGenerator (obj) {
  return obj && typeof obj.next === 'function' && typeof obj.throw === 'function'
}
