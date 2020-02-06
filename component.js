var assert = require('assert')
var Partial = require('./partial')
var Context = require('./context')
var Ref = require('./ref')

var stack = []

module.exports = Component

function Component (key, render, args) {
  if (this instanceof Component) {
    assert(key, 'nanohtml: Component key is required')
    this.key = key
    this.args = args
    this._render = typeof render === 'function' ? render : this._render.bind(this)
    return this
  }

  if (typeof key === 'function') {
    render = key
    key = render.name || 'component'
  }
  assert(typeof render === 'function', 'nanohtml: render should be type function')
  key = typeof key === 'string' ? Symbol(key) : key
  return function () {
    return new Component(key, render, Array.prototype.slice.call(arguments))
  }
}

Component.prototype.render = function () {
  throw new Error('nanohtml: render should be implemented')
}

Component.prototype.key = function (key) {
  key = typeof key === 'string' ? Symbol(key) : key
  return new Component(key, this.render, this.args)
}

Component.prototype.render = function (ref) {
  var ctx = ref ? ref.context : new Context()
  stack.push(ctx)
  try {
    var res = this._render.apply(undefined, this.args)
    assert(res instanceof Partial, 'nanohtml: component should return html partial')
    res.context = ctx
    res.key = this.key
    return res
  } finally {
    var last = stack.pop()
    assert(last === ctx, 'nanohtml: context mismatch, render cycle out of sync')
    assert(ctx.counter === 0, 'nanohtml: context failed to rollback counter')
  }
}

Component.Component = Component
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
// Idea for generator components
function * Button (num = 0, render) {
  load()

  try {
    while (true) {
      yield html`<button onclick=${onclick}>Clicked ${num} times</button>`
    }
  } finally {
    unload()
  }

  function onclick () {
    num++
    render()
  }
}

// Component using hooks
var Foo = Component(function Foo () {
  var [count, setCount] = useState(0)

  onload(function (el) {
    console.log('mounted!)
    return function (el) {
      console.log('unmounted!')
    }
  })

  return html`<button onclick=${() => setCount(num++)}>Clicked ${num} times</button>
})

// Usage with keys
html`
  <div>${Foo('unkeyed-foo')}</div>
  <div>${Foo('keyed-foo').key('foo-key')}</div>
`
*/
