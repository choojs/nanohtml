var document = require('global/document')
var hyperx = require('hyperx')
var morphdom = require('morphdom')
var css = require('dom-css')
var createElementCalls = require('./lib/create-element-calls.js')

var KEY = 'bel'
var hx = hyperx(function (tag, props, children) {
  var calls = createElementCalls(tag, props, children)

  // First is always the call to create an element
  var first = calls.splice(0, 1)[0]
  var el = document[first[0]].apply(document, first.slice(1))

  // Perform the calls on the element
  for (var i = 0; i < calls.length; i++) {
    var c = calls[i]
    if (c[0] === 'style') {
      css(el, c[1])
    } else if (c[0] === 'expr') {
      el[c[1]] = c[2]
    } else if (c[0].slice(0, 14) === 'createTextNode') {
      var tnode = document[c[0]].apply(document, c.slice(1))
      el.appendChild(tnode)
    } else {
      el[c[0]].apply(el, c.slice(1))
    }
  }

  return el
})

var id = 0

module.exports = function bel () {
  var el = hx.apply(this, arguments)
  if (!belid(el)) {
    belid(el, id)
    id += 1
  }
  el.update = function (newel) {
    if (typeof newel === 'function') {
      newel = newel()
    }
    belid(newel, belid(el))
    if (el && !el.parentNode) {
      // Lost element, find it
      el = document.querySelector('[data-bel="' + el.dataset.bel + '"]')
    }
    return morphdom(el, newel, {
      getNodeKey: function (el) {
        var id = belid(el)
        return id || el.id
      }
    })
  }
  return el
}

if (typeof document !== 'undefined' && document.head && document.head.dataset) {
  belid = function belid (el, val) {
    if (el && el.dataset) {
      if (arguments.length > 1) {
        el.dataset[KEY] = val
      } else {
        return el.dataset[KEY]
      }
    }
  }
} else {
  belid = function belid (el, val) {
    if (el && typeof el.getAttribute === 'function') {
      if (arguments.length > 1) {
        return el.setAttribute('data-' + KEY, val)
      } else {
        return el.getAttribute('data-' + KEY)
      }
    }
  }
}
