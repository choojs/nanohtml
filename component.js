var assert = require('nanoassert')
var Partial = require('./nanohtml')

var tracking = new WeakMap()
var windows = new WeakSet()
var loadid = makeId()
var stack = []

export function Component (fn, key, args) {
  if (this instanceof Component) {
    this.beforerender = []
    this.afterupdate = []
    this.cleanup = []
    this.refs = new Map()
    this.args = args
    this.key = key
    this.fn = fn
    return this
  }

  key = fn.name ? Symbol(fn.name) : Symbol('component')
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

Component.prototype.render = function render (node) {
  assert(!node || node instanceof Node, 'nanohtml: node should be type Node')
  var cached = node ? node.state.get(this.key) : null
  this.index = this.args.length
  if (cached) this.args = cached.args.map((arg, i) => this.args[i] || arg)
  stack.unshift(this)
  try {
    if (cached) unwind(cached.cleanup, this.args)
    for (const ref of this.refs.values()) ref.claimed = false
    const partial = this.fn(...this.args)
    node = partial.render(node)
    assert(node instanceof Node, 'nanohtml: node should be type Node')
    unwind(this.beforerender, [node.element])
    unwind(this.afterupdate, this.args)
    node.state.set(this.key, this)
    this.node = node
    return node
  } finally {
    const component = stack.shift()
    assert(component === this, 'nanohtml: stack out of sync')
  }
}

function unwind (arr, args) {
  while (arr.length) {
    const fn = arr.pop()
    fn(...args)
  }
}

export function Ref (uid = makeId()) {
  var serialize = () => uid

  if (typeof window === 'undefined') {
    return { toString: serialize, toJSON: serialize }
  }

  var component = stack[0]
  var ref = component.refs.get(uid)

  if (!ref || ref.claimed) {
    for (const _ref of component.refs.values()) {
      if (!_ref.claimed) ref = _ref
    }

    if (!ref || ref.claimed) {
      ref = Object.create(document.getElementsByClassName(uid))
      ref.toJSON = serialize
      ref.toString = serialize
      component.refs.set(uid, ref)
    }
  }

  ref.claimed = true
  return ref
}

if (typeof window !== 'undefined') {
  Ref.prototype = window.HTMLCollection.prototype
}

function makeId () {
  return `__ref-${Math.random().toString(36).substr(-4)}`
}

export function onupdate (fn) {
  var component = stack[0]
  if (typeof fn === 'function') {
    component.afterupdate.push(function (component) {
      var res = fn(...component.args)
      if (typeof res === 'function') {
        component.cleanup.push(function (component) {
          fn(...component.args)
        })
      }
    })
  }

  return function (...args) {
    var next = new Component(component.fn, component.key, args)
    next.render(component.node)
  }
}

export function memo (initial) {
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
export function onload (fn) {
  stack[0].beforerender.push(function (el) {
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
      if (!windows.has(this)) create(this)
    } else {
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

function create (window) {
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
    for (let i = 0, len = nodes.length; i < len; i++) {
      if (!tracking.has(nodes[i])) continue
      call(nodes[i], idx)
      const entry = tracking.get(nodes[i])
      for (let _i = 0, _len = entry.children.length; _i < _len; _i++) {
        call(entry.children[_i], idx)
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
    for (let i = 0, len = mutations.length; i < len; i++) {
      const { addedNodes, removedNodes } = mutations[i]
      callAll(removedNodes, 1)
      callAll(addedNodes, 0)
    }
  }
}
