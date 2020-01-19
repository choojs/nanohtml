var assert = require('assert')
var Partial = require('./partial')

var stack = []

module.exports = Hook

function Hook (fn) {
  var args = Array.prototype.slice.call(arguments, 1)
  this.proxy = null
  this.fn = fn
  this.args = args
  this.stack = []
  this.counter = 0
}

Hook.prototype = Object.create(Partial.prototype)
Hook.prototype.constructor = Hook

Hook.prototype.unwind = function unwind () {
  stack.push(this)
  try {
    this.proxy = this.fn.apply(undefined, arguments)
    assert(this.proxy instanceof Partial, 'nanohtml: component should return html partial')
  } finally {
    var last = stack.pop()
    assert(last === this, 'nanohtml: hooks out of sync')
    assert(this.counter === 0, 'nanohtml: hook failed to rollback counter')
  }
  return this.proxy
}

Hook.prototype.values = function values () {

}

Hook.prototype.render = function render () {
  stack.push(this)
  try {
    this.proxy = this.fn.apply(undefined, arguments)
    assert(this.proxy instanceof Partial, 'nanohtml: component should return html partial')
  } finally {
    var last = stack.pop()
    assert(last === this, 'nanohtml: hooks out of sync')
    assert(this.counter === 0, 'nanohtml: hook failed to rollback counter')
  }
  return this.proxy
}

Hook.useState = function useState (initialState) {
  var hook = stack[stack.length - 1]
  var index = ++hook.counter
  var state = index >= hook.stack.length
    ? hook.stack[index]
    : hook.stack[index] = initialState
  hook.counter--
  return [state, setState]

  function setState (next) {
    hook.stack[index] = next
    hook.render()
  }
}
