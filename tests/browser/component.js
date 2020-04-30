var test = require('tape')
var { html, render } = require('../../nanohtml')
var { Component, Ref, memo, onupdate, onload } = require('../../component')

test('renders html', function (t) {
  var el = render(html`<span>Hello ${'planet'}!</span>`)
  t.ok(el instanceof window.Element, 'renders an element')
  t.equal(el.innerText, 'Hello planet!', 'renders partials')
  t.end()
})

test('renders nested html', function (t) {
  var el = render(html`<span>Hello ${html`<span>planet</span>`}!</span>`)
  t.equal(el.childElementCount, 1, 'has children')
  t.equal(el.firstElementChild.innerText, 'planet', 'children rendered')
  t.end()
})

test('renders array of children', function (t) {
  var el = render(html`<span>Hello ${[html`<span>planet</span>`]}!</span>`)
  t.equal(el.childElementCount, 1, 'has children')
  t.equal(el.firstElementChild.innerText, 'planet', 'children rendered')
  t.end()
})

test('can mount in DOM', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span><span>Hi <strong>world</strong>!</span></span>'
  var firstChild = div.firstElementChild
  document.body.appendChild(div)

  render(html`<div id="${id}"><span>Hello ${html`<span>planet</span>`}!</span></div>`, div)
  var res = document.getElementById(id)
  t.ok(res, 'element was mounted')
  t.ok(res.isSameNode(div), 'morphed onto existing node')
  t.ok(firstChild.isSameNode(res.firstElementChild), 'children morphed too')
  t.equal(res.innerText, 'Hello planet!', 'content match')
  document.body.removeChild(div)
  t.end()
})

test('updates in place', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(main('planet'), div)
  var res = document.getElementById(id)
  t.equal(res.innerText, 'planet', 'content mounted')
  render(main('world'), div)
  t.equal(res.innerText, 'world', 'content updated')
  document.body.removeChild(div)
  t.end()

  function main (text) {
    return html`<div><span>Hello ${html`<span id="${id}">${text}</span>`}!</span></div>`
  }
})

test('persists in DOM between mounts', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <span>world</span>!</span>'
  document.body.appendChild(div)

  render(foo('planet'), div)
  var res = document.getElementById(id)
  t.equal(res.innerText, 'planet', 'did mount')

  render(bar('world'), div)
  var updated = document.getElementById(id)
  t.ok(res.isSameNode(updated), 'same node')
  t.equal(updated.innerText, 'world', 'content updated')
  document.body.removeChild(div)
  t.end()

  function foo (text) {
    return html`<div><span>Hello ${name(text)}!</span></div>`
  }

  function bar (text) {
    return html`<div><span>Hello ${name(text)}!</span></div>`
  }

  function name (text) {
    return html`<span id="${id}">${text}</span>`
  }
})

test('updating with null', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(main('planet'), div)
  var res = document.getElementById(id)
  t.equal(res.innerHTML, 'Hello planet!', 'did mount')
  render(main(false), div)
  t.equal(res.innerHTML, 'Hello !', 'node was removed')
  render(main('world'), div)
  t.equal(res.innerHTML, 'Hello world!', 'node added back')
  document.body.removeChild(div)
  t.end()

  function main (text) {
    return html`<div><span id="${id}">Hello ${text || null}!</span></div>`
  }
})

test('updating from null', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(main(false), div)
  var res = document.getElementById(id)
  t.equal(res.innerHTML, 'Hello !', 'node was removed')
  render(main('planet'), div)
  t.equal(res.innerHTML, 'Hello planet!', 'did mount')
  render(main('world'), div)
  t.equal(res.innerHTML, 'Hello world!', 'node added back')
  document.body.removeChild(div)
  t.end()

  function main (text) {
    return html`<div><span id="${id}">Hello ${text || null}!</span></div>`
  }
})

test('updating with array', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = 'Hi <span>world</span>!'
  document.body.appendChild(div)

  var children = [
    html`<span>planet</span>`,
    html`<span>world</span>`
  ]
  render(main(children[0]), div)
  var firstChild = div.firstElementChild
  t.equal(div.innerText, 'Hello planet!', 'child mounted')
  render(main(children), div)
  t.equal(div.innerText, 'Hello planetworld!', 'all children mounted')
  // t.equal(div.firstElementChild, firstChild, 'child remained in place')
  document.body.removeChild(div)
  t.end()

  function main (children) {
    return html`<div>Hello ${children}!</div>`
  }
})

test('alternating partials', function (t) {
  var id = makeId()
  var world = html`<span>world</span>`
  var planet = html`<span>planet</span>`
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(main(planet), div)
  var res = document.getElementById(id)
  t.equal(res.innerText, 'Hello planet!', 'did mount')
  render(main(world), div)
  t.equal(res.innerText, 'Hello world!', 'did update')
  document.body.removeChild(div)
  t.end()

  function main (child) {
    return html`<div><span id="${id}">Hello ${child}!</span></div>`
  }
})

test('reordering children', function (t) {
  var ids = [makeId(), makeId()]
  var children = [
    html`<span id="${ids[0]}">world</span>`,
    html`<span id="${ids[1]}">planet</span>`
  ]
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(main(children), div)
  var world = document.getElementById(ids[0])
  var planet = document.getElementById(ids[1])
  t.equal(world.nextSibling, planet, 'mounted in order')
  t.equal(div.innerText, 'Hello worldplanet!', 'children in order')
  render(main(children.reverse()), div)
  world = document.getElementById(ids[0])
  planet = document.getElementById(ids[1])
  t.equal(planet.nextElementSibling, world, 'children reordered')
  t.equal(div.innerText, 'Hello planetworld!', 'children in (reversed) order')
  document.body.removeChild(div)
  t.end()

  function main (children) {
    return html`<div><span>Hello ${children}!</span></div>`
  }
})

test('component can render', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  var Greeting = Component(function Greeting (text) {
    return html`<span>Hello <span id="${id}">${text}</span>!</span>`
  })

  render(main('planet'), div)
  var res = document.getElementById(id)
  t.equal(res.innerText, 'planet', 'content mounted')
  render(main('world'), div)
  t.equal(res.innerText, 'world', 'content updated')
  document.body.removeChild(div)
  t.end()

  function main (text) {
    return html`<div>${Greeting(text)}</div>`
  }
})

test('component can update', function (t) {
  t.plan(6)

  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  var update
  var BEFORE_UPDATE = 0
  var AFTER_UPDATE = 1
  var state = BEFORE_UPDATE
  var Greeting = Component(function Greeting (value) {
    update = onupdate(function afterupdate (value) {
      t.equal(state, value, 'afterupdate called with latest argument')
      return function beforeupdate (value) {
        t.equal(state, value, 'beforeupdate called with latest argument')
      }
    })
    return html`<span>Hello <span id="${id}">${value}</span>!</span>`
  })

  render(main(state), div)
  var res = document.getElementById(id)
  t.equal(res.innerText, BEFORE_UPDATE.toString(), 'content mounted')
  t.equal(typeof update, 'function', 'onupdate returns function')
  update(++state)
  t.equal(res.innerText, AFTER_UPDATE.toString(), 'content updated')
  document.body.removeChild(div)

  function main (value) {
    return html`<div>${Greeting(value)}</div>`
  }
})

test('component can memoize arguments', function (t) {
  t.plan(12)

  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  var update
  var BEFORE_UPDATE = [0, 0, 0]
  var AFTER_UPDATE = [1, 1, 1]
  var state = BEFORE_UPDATE
  var Greeting = Component(function Greeting (a, b = memo(state[1]), c = memo(init)) {
    t.deepEqual([a, b, c], state, 'all arguments in place')
    update = onupdate(function afterupdate (a, b, c, d = memo(1)) {
      t.deepEqual([a, b, c], state, 'afterupdate called with latest argument')
      t.equal(d, 1, 'afterupdate can add more args')
      return function beforeupdate (a, b, c, d = memo()) {
        t.deepEqual([a, b, c], state, 'beforeupdate called with latest argument')
        t.equal(d, 1, 'beforeupdate received additional arg')
      }
    })
    return html`<span>Hello <span id="${id}">${[a, b, c].join('')}</span>!</span>`
  })

  render(main(state[0]), div)
  var res = document.getElementById(id)
  t.equal(res.innerText, BEFORE_UPDATE.join(''), 'content mounted')
  state = AFTER_UPDATE
  update(...state)
  t.equal(res.innerText, AFTER_UPDATE.join(''), 'content updated')
  document.body.removeChild(div)

  function init (a, b) {
    t.equal(a, state[0], 'static arg forwarded to init')
    t.equal(b, state[1], 'dynamic arg forwarded to init')
    return state[2]
  }

  function main (value) {
    return html`<div>${Greeting(value)}</div>`
  }
})

test('component can access children with ref', function (t) {
  t.plan(7)

  var ids = [makeId(), makeId()]
  var div = document.createElement('div')
  div.innerHTML = '<ul><li>a</li><li>b</li></ul>'
  document.body.appendChild(div)

  var List = Component(function List () {
    var refA = new Ref()
    var refB = new Ref('test')
    t.ok(refA instanceof Ref, 'inherits from Ref')
    t.ok(refA instanceof window.HTMLCollection, 'inherits from HTMLCollection')
    onupdate(function () {
      window.requestAnimationFrame(function () {
        var [a, b] = ids.map((id) => document.getElementById(id))
        t.equal(a, refA[0], 'ref a found')
        t.equal(b, refB[0], 'ref b found')
        t.equal(b.className, 'test', 'custom className used')
        t.equal(refB.toString(), 'test', 'can be serialized to string')
        t.equal(JSON.stringify({ refB }), '{"refB":"test"}', 'can be serialized to JSON')
        document.body.removeChild(div)
      })
    })
    return html`
      <ul>
        <li id="${ids[0]}" class="${refA}">a</li>
        <li id="${ids[1]}" class="${refB}">b</li>
      </ul>
    `
  })

  render(main(), div)

  function main () {
    return html`<div>${List()}</div>`
  }
})

test('component is notified of being added to the DOM', function (t) {
  t.plan(4)

  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  var Greeting = Component(function Greeting () {
    onload(function (element) {
      var el = document.getElementById(id)
      t.pass('onload handler called')
      t.equal(element, el, 'onload handler called with root element')
      document.body.removeChild(div)
      return function (value) {
        t.pass('onload callback called')
        t.equal(element, el, 'onload callback called with root element')
      }
    })
    return html`<span id="${id}">Hello <span>planet</span>!</span>`
  })

  render(main(), div)

  function main (value) {
    return html`<div>${Greeting(value)}</div>`
  }
})

function makeId () {
  return 'uid-' + Math.random().toString(36).substr(-4)
}
