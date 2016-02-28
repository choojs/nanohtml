/* global CustomEvent */

var hyperx = require('hyperx')
var diff = require('diffhtml')

var hx = hyperx(function createElement (tag, props, children) {
  var el = document.createElement(tag)
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      el[p] = props[p]
    }
  }
  function appendChild (childs) {
    if (!Array.isArray(childs)) return
    for (var i = 0; i < childs.length; i++) {
      var node = childs[i]
      if (Array.isArray(node)) {
        appendChild(node)
        continue
      }

      // TODO: Escaping?

      if (typeof node === 'number' ||
        typeof node === 'boolean' ||
        node instanceof Date ||
        node instanceof RegExp) {
        node = node.toString()
      }

      if (typeof node === 'string') {
        node = document.createTextNode(node)
      }

      if (node && node.nodeName && node.nodeType) {
        el.appendChild(node)
      }
    }
  }
  appendChild(children)

  // TODO: Validation checks
  // TODO: Check for a11y things

  return el
})

module.exports = function bel (str) {
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
