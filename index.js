/* global CustomEvent */

var h = require('hyperscript')
var hyperx = require('hyperx')
var hx = hyperx(h)
var diff = require('diffhtml')

module.exports = function bel () {
  var el = hx.apply(this, arguments)
  el.toString = function () {
    return el.outerHTML
  }
  el.send = function (action) {
    var args = Array.prototype.slice.call(arguments, 1)
    if (args.length === 1) {
      args = args[0]
    }
    var e = new CustomEvent(action, {
      detail: args,
      bubbles: true,
      cancelable: true
    })
    return this.dispatchEvent(e)
  }
  el.rerender = function (newel) {
    if (typeof newel === 'function') {
      newel = newel()
    }
    diff.outerHTML(el, newel)
    return newel
  }
  return el
}
