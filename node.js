import assert from 'nanoassert/index.js'

export default class Node {
  constructor (element, editors, bind) {
    this.state = new Map()
    this.element = element
    this.bind = bind

    // Sort updaters by index
    this.updaters = editors.sort(function (a, b) {
      return a.index - b.index
    }).map(function (editor) {
      return function update () {
        return editor.update.apply(editor, arguments)
      }
    })
  }

  update (values) {
    assert(Array.isArray(values), 'values should be type array')
    assert(values.length === this.updaters.length, 'nanohtml: number of values (' + values.length + ') must match number of slots (' + this.updaters.length + ')')
    for (var i = 0, len = values.length; i < len; i++) {
      this.updaters[i](values[i], values)
    }
  }
}
