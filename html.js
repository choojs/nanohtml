var parse = require('./parse')
var store = new WeakMap()

module.exports = function html (template, ...values) {
  var render = store.get(template)
  if (!render) {
    render = parse.apply(undefined, [template].concat(values))
    store.set(template, render)
  }
  return { key: template, values: values, render: render }
}
