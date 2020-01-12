var assert = require('assert')
var Ref = require('./ref')
var cache = require('./cache')
var Template = require('./template')

module.exports = parse

function parse (tmpl, values) {
  var template = Template.parse(tmpl, values)

  return function render () {
    // Render element from template
    var res = template.render()

    // Cache element utilities
    cache.set(res.element, new Ref({
      key: template.key,
      update: update,
      bind: res.bind
    }))

    // Sort updaters by index
    var updaters = res.editors.sort(function (a, b) {
      return a.index - b.index
    }).map(function (editor) {
      return function update () {
        return editor.update.apply(editor, arguments)
      }
    })

    return { element: res.element, update: update }

    // Run all updaters in order with given values
    // arr -> void
    function update (values) {
      assert(Array.isArray(values), 'values should be type array')
      assert.equal(values.length, updaters.length, 'nanohtml: number of values (' + values.length + ') must match number of slots (' + updaters.length + ')')
      for (var i = 0, len = values.length; i < len; i++) {
        updaters[i](values[i], values)
      }
    }
  }
}
