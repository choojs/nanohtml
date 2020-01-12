var assert = require('assert')

module.exports = Ref

// Reference to rendered element info/utilities
// (any, fn, fn?) -> Ref
function Ref (opts) {
  if (!(this instanceof Ref)) return new Ref(opts)
  assert(opts.key, 'nanohtml: Ref should be provided key')
  this.key = opts.key
  if (typeof opts.update === 'function') this.update = opts.update
  if (typeof opts.bind === 'function') this.bind = opts.bind
}
