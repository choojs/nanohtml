var hyperx = require('hyperx')
var morphdom = require('morphdom')
var create = require('./create.js')
var hx = hyperx(create())

var KEY = '_belid'
var id = 0
var viewIndex = Object.create(null)

module.exports.create = create
module.exports = function bel () {
  var el = hx.apply(this, arguments)
  el[KEY] = id
  viewIndex[id] = el
  id++
  el.update = function (newel) {
    if (typeof newel === 'function') {
      newel = newel()
    }
    var found = viewIndex[el[KEY]]
    if (found) el = found
    // Morph and update the viewIndex to the new element
    viewIndex[el[KEY]] = morphdom(el, newel)
    // Remove the newel from viewIndex as its not needed anymore
    delete viewIndex[newel[KEY]]
    return el
  }
  return el
}
