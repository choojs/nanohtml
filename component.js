var assert = require('assert')
var Partial = require('./partial')
var Context = require('./context')

var stack = []

module.exports = Component

function Component (key, render, args) {
  if (this instanceof Component) {
    assert(key, 'nanohtml: Component key is required')
    this.key = key
    render = typeof render === 'function' ? render : this.render.bind(this)
    return Render
  }

  if (typeof key === 'function') {
    render = key
    key = render.name || 'component'
  }
  assert(typeof render === 'function', 'nanohtml: render should be type function')
  key = typeof key === 'string' ? Symbol(key) : key
  return function Proxy () {
    if (this instanceof Proxy) return new Component(arguments[0], render)
    args = Array.prototype.slice.call(arguments)
    return Render
  }

  function Render (ctx) {
    assert(ctx instanceof Context, 'nanohtml: context should be type Context')
    stack.push(ctx)
    try {
      var res = render.apply(undefined, args)
      assert(res instanceof Partial, 'nanohtml: component should return html partial')
      res.key = key
      return res
    } finally {
      var last = stack.pop()
      assert(last === ctx, 'nanohtml: context mismatch, render cycle out of sync')
      assert(ctx.counter === 0, 'nanohtml: context failed to rollback counter')
    }
  }
}

Component.Component = Component
Component.prototype = Object.create(Partial.prototype)
Component.prototype.constructor = Component

Component.prototype.render = function render () {
  throw new Error('nanohtml: render should be implemented')
}

Component.useKey = function useKey (Fn, key) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    try {
      // Create component (Functional/Class)
      var res = new Fn(key)
      return res.apply(undefined, args)
    } catch (err) {
      // Create Partial with custom key
      return Object.assign(Fn.apply(undefined, args), { key: key })
    }
  }
}

Component.useState = function useState (initialState) {
  var ctx = stack[stack.length - 1]
  var index = ++ctx.counter
  var state = index >= ctx.stack.length
    ? ctx.stack[index] = initialState
    : ctx.stack[index]
  ctx.counter--
  return [state, setState]

  function setState (next) {
    ctx.stack[index] = next
    ctx.render()
  }
}

/*
var Foo = Component(function Foo () {
  // use hooks here
  return html`<span>${'Foo'}</span>`
})

class Bar extends Component {
  // use methods here
  render () {
    return html`<span>Bar</span>`
  }
}

var Baz = function () {
  // no hooks allowed
  return html`<span>${'Baz'}</span>`
}

var myBar = new Bar('bar-key')

html`
  <div>${Baz('unkeyed-baz')}</div>
  <div>${Foo('unkeyed-foo')}</div>
  <div>${myBar('keyed-bar')}</div>
  <div>${useKey(Baz, 'baz-key')('keyed-baz')}</div>
  <div>${useKey(Foo, 'foo-key')('keyed-foo')}</div>
  <div>${useKey(Bar, 'bar-key')('keyed-bar')}</div>
`
*/
