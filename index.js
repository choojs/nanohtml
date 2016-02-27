/* global CustomEvent */

var h = require('hyperscript')
var hyperx = require('hyperx')
var hx = hyperx(h)

module.exports = function bel () {
  var el = hx.apply(this, arguments)
  el.toString = function (state) {
    return el.outerHTML
  }
  el.send = function (action) {
    var args = Array.prototype.slice.call(arguments, 1)
    if (args.length === 1) {
      args = args[0]
    }
    var e = new CustomEvent(action, { detail: args })
    el.dispatchEvent(e)
  }
  return el
}
