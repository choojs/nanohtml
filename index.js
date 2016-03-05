var document = require('global/document')
var hyperx = require('hyperx')
var morphdom = require('morphdom')
var create = require('./create.js')()

var KEY = 'bel'
var hx = hyperx(create)
var id = 0

module.exports.create = create
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
