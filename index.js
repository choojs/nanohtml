var document = require('global/document')
var hyperx = require('hyperx')
var morphdom = require('morphdom')

var SET_ATTR_PROPS = {
  class: 1,
  value: 1,
  checked: 1,
  disabled: 1,
  required: 1
}
var BOOL_PROPS = {
  checked: 1,
  disabled: 1,
  required: 1
}

var hx = hyperx(function createElement (tag, props, children) {
  var el = document.createElement(tag)
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var val = props[p]
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS[p]) {
        if (val === 'true') val = p
        else if (val === 'false') continue
      }
      // If a property prefers setAttribute instead
      if (SET_ATTR_PROPS[p]) {
        el.setAttribute(p, val)
      } else {
        el[p] = val
      }
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

// TODO: SVG Support

var id = 0

module.exports = function bel () {
  var el = hx.apply(this, arguments)
  if (!el.id) {
    el.id = 'e' + id
    id += 1
  }
  el.toString = function () {
    return el.outerHTML
  }
  el.update = function (newel) {
    if (typeof newel === 'function') {
      newel = newel()
    }
    // TODO: Someday eliminate the need for this
    // We need to look up the actual element in the DOM because a parent element
    // could have called .update() and replaced the child node
    el = document.getElementById(el.id)
    morphdom(el, newel)
  }
  return el
}
