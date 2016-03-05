var hyperx = require('hyperx')
var morphdom = require('morphdom')
var create = require('./create.js')
var hx = hyperx(create())

module.exports.create = create
module.exports = function bel () {
  var el = hx.apply(this, arguments)
  el.update = function (newel) {
    if (typeof newel === 'function') {
      newel = newel()
    }
    return morphdom(el, newel)
  }
  return el
}
