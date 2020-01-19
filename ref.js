var assert = require('assert')
var Partial = require('./partial')

module.exports = Ref

/**
 * Rendered element info/utilities
 * @param {*} key Unique idientifier
 * @param {Function} bind Bind Element to another Element
 * @param {Function} update Update Element
 */
function Ref (partial, bind, update) {
  assert(partial instanceof Partial, 'nanohtml: partial should be an instance of Partial')
  assert(typeof bind === 'function', 'nanohtml: bind should be type function')
  this.key = partial.template
  this.bind = bind
  if (typeof update === 'function') this.update = update
}
