var Partial = require('./partial')
var parse = require('./parse')
var store = new WeakMap()

module.exports = function html (tmpl) {
  var values = Array.prototype.slice.call(arguments, 1)
  return new Partial(tmpl, values, render)

  function render () {
    var template = store.get(tmpl)
    if (!template) {
      template = parse(tmpl, values)
      store.set(tmpl, template)
    }
    return template.apply(undefined, arguments)
  }
}
