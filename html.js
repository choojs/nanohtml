var parse = require('./parse')
var store = new WeakMap()

module.exports = function html (template, ...values) {
  var parsed = store.get(template)
  if (!parsed) {
    parsed = parse.apply(undefined, [template].concat(values))
    store.set(template, parsed)
  }

  return { template, values, createElement }

  function createElement () {
    var res = parsed()
    res.update(values)
    return res
  }
}
