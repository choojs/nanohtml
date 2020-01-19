var assert = require('assert')
var morph = require('nanomorph')
var Partial = require('./partial')
var cache = require('./cache')
var parse = require('./parse')
var Ref = require('./ref')

module.exports = function render (value, target) {
  if (typeof window === 'undefined') return value
  assert(value instanceof Partial, 'nanohtml: render should be called with html partial')

  var ref = cache.get(target)
  if (ref && ref instanceof Ref && ref.key === value.key) {
    if (value instanceof Component) value = value.
    ref.update(value.values)
    return target
  }

  var res = parse(value)

  var element
  if (target) element = morph(target, res.element, { cache })
  else element = res.element
  res.update(value.values)

  return element
}
