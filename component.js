var assert = require('nanoassert')
var { Partial } = require('./nanohtml')

var identifier = Symbol('nanohtml/component')
var tracking = new WeakMap()
var windows = new WeakSet()
var loadid = makeId()
var stack = []

exports.Ref = Ref
exports.memo = memo
exports.onload = onload
exports.onupdate = onupdate
exports.Component = Component
exports.identifier = identifier

function Component (fn, key, args) {
  if (this instanceof Component) {
    this.beforeupdate = []
    this.afterupdate = []
    this.beforeload = []
    this.refs = []
    this.args = args
    this.key = key
    this.fn = fn
    return this
  }

  key = Symbol(fn.name || 'nanohtml/component')
  return function (...args) {
    return new Component(fn, key, args)
  }
}

Component.prototype = Object.create(Partial.prototype)
Component.prototype.constructor = Component

Component.prototype.key = function key (key) {
  this.key = key
  return this
}

Component.prototype.resolve = function (ctx) {
  var cached = ctx ? ctx.state.get(identifier) : null
  this.index = this.args.length
  if (cached) {
    this.args = cached.args.map((arg, i) => {
      return typeof this.args[i] === 'undefined' ? arg : this.args[i]
    }).concat(this.args.slice(cached.args.length))
  }
  stack.unshift(this)
  try {
    const partial = this.fn(...this.args)
    partial.key = this.key
    return partial
  } finally {
    const component = stack.shift()
    assert(component === this, 'nanohtml/component: stack out of sync')
  }
}

Component.prototype.render = function (oldNode) {
  var partial = this.resolve()
  var ctx = Partial.prototype.render.call(partial, oldNode)
  ctx.state.set(identifier, this)
  this.rendered = partial
  return ctx
}

Component.prototype.update = function (ctx) {
  this.ctx = ctx // store context for async updates
  var cached = ctx.state.get(identifier)
  stack.unshift(this)
  try {
    const partial = this.rendered || this.resolve(ctx)
    unwind(cached.beforeupdate, this.args)
    Partial.prototype.update.call(partial, ctx)
    unwind(this.refs.map((ref) => (el) => ref.init(el)), [ctx.element])
    assert(
      this.refs.every(({ uid }) => !ctx.element.classList.contains(uid)),
      'nanohtml/component: refs cannot be used with root element, use onload to access root element'
    )
    unwind(this.afterupdate, this.args)
    unwind(this.beforeload, [ctx.element])
    ctx.state.set(identifier, this)
  } finally {
    const component = stack.shift()
    assert(component === this, 'nanohtml/component: stack out of sync')
  }
}

function Ref (uid = makeId()) {
  assert(stack.length, 'nanohtml/component: cannot call Ref outside component render cycle')
  this.uid = uid
  stack[0].refs.push(this)
  if (typeof window === 'undefined' || typeof Proxy !== 'function') return this
  return new Proxy(this, {
    get: (self, key, receiver) => {
      if (this[key]) return this[key]
      return Reflect.get(this.collection || this, key, receiver)
    }
  })
}
Ref.prototype = Object.create(window.HTMLCollection.prototype)
Ref.prototype.constructor = Ref
Ref.prototype[Symbol.toPrimitive] = serializeRef
Ref.prototype.toString = serializeRef
Ref.prototype.toJSON = serializeRef
Ref.prototype.init = function (element) {
  this.collection = element.getElementsByClassName(this.uid)
}
// for compatibility with legacy browsers w/o Proxy
Ref.prototype.item = function (index) {
  return this.collection.item(index)
}
// for compatibility with legacy browsers w/o Proxy
Ref.prototype.namedItem = function (name) {
  return this.collection.namedItem(name)
}

function serializeRef () {
  return this.uid
}

function unwind (arr, args) {
  while (arr.length) {
    const fn = arr.pop()
    fn(...args)
  }
}

function makeId () {
  return `__ref-${Math.random().toString(36).substr(-4)}`
}

function onupdate (fn) {
  assert(stack.length, 'nanohtml/component: cannot call onupdate outside component render cycle')
  var component = stack[0]
  if (typeof fn === 'function') {
    component.afterupdate.push(function (...args) {
      var res = fn(...args)
      if (typeof res === 'function') {
        component.beforeupdate.push(res)
      }
    })
  }

  return function (...args) {
    assert(component.ctx, 'nanohtml/component: cannot update while rendering')
    var next = new Component(component.fn, component.key, args)
    next.update(component.ctx)
  }
}

function memo (initial) {
  assert(stack.length, 'nanohtml/component: cannot call memo outside component render cycle')
  var index = stack[0].index++
  var { args } = stack[0]
  var value = args[index]
  if (typeof value === 'undefined') {
    if (typeof initial === 'function') value = initial(...args)
    else value = initial
    args[index] = value
  }
  return value
}

/**
 * An implementation of https://github.com/hyperdivision/fast-on-load
 *
 * Copyright 2020 Hyperdivision ApS (https://hyperdivision.dk)
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
function onload (fn) {
  assert(stack.length, 'nanohtml/component: cannot call onload outside component render cycle')
  stack[0].beforeload.push(function (el) {
    el.classList.add(loadid)

    var entry
    if (!tracking.has(el)) {
      entry = {
        on: [on],
        off: [],
        state: 2,
        children: el.getElementsByClassName(loadid)
      }
      tracking.set(el, entry)
      if (!windows.has(this)) createObserver(this)
    } else {
      // FIXME: this will reset the queue on every onload
      entry = tracking.get(el)
      entry.on = [on]
      entry.off = []
    }

    function on (el) {
      var res = fn(el)
      if (typeof res === 'function') entry.off.push(res)
    }
  })
}

function createObserver (window) {
  windows.add(window)

  const document = window.document
  const observer = new window.MutationObserver(onchange)

  const isConnected = 'isConnected' in window.Node.prototype
    ? node => node.isConnected
    : node => document.documentElement.contains(node)

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })

  function callAll (nodes, idx) {
    for (const node of nodes) {
      if (!node.classList) continue
      if (node.classList.contains(loadid)) call(node, idx)
      const children = tracking.has(node)
        ? tracking.get(node).children
        : node.getElementsByClassName(loadid)
      for (const child of children) {
        call(child, idx)
      }
    }
  }

  // State Enum
  // 0: mounted
  // 1: unmounted
  // 2: undefined
  function call (node, state) {
    var entry = tracking.get(node)
    if (!entry || entry.state === state) return
    if (state === 0 && isConnected(node)) {
      entry.state = 0
      for (const fn of entry.on) fn(node)
    } else if (state === 1 && !isConnected(node)) {
      entry.state = 1
      for (const fn of entry.off) fn(node)
    }
  }

  function onchange (mutations) {
    for (const { addedNodes, removedNodes } of mutations) {
      callAll(removedNodes, 1)
      callAll(addedNodes, 0)
    }
  }
}
