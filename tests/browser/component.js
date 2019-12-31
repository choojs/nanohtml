var test = require('tape')
// var component = require('../../component')
var render = require('../../render')
var html = require('../../html')

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

test('can mount in DOM', function (t) {
  var id = makeID()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(html`<div id="${id}"><span>Hello ${html`<span>planet</span>`}!</span></div>`, div)
  var res = document.getElementById(id)
  t.ok(res, 'element was mounted')
  t.ok(res.isSameNode(div), 'morphed onto existing node')
  t.equal(res.innerText, 'Hello planet!', 'content match')
  document.body.removeChild(div)
  t.end()
})

test('updates in place', function (t) {
  var id = makeID()
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
  var id = makeID()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
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
  var id = makeID()
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
  var id = makeID()
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

test('different partials', function (t) {
  var id = makeID()
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

function makeID () {
  return 'uid-' + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
}

// test('creates an element', function (t) {
//   t.plan(5)

//   var greeting = component(function (name) {
//     return html`<span>Hello ${name}!</span>`
//   })

//   t.equal(typeof greeting, 'function', 'component exposes function')
//   var create = greeting('planet')
//   t.equal(typeof create, 'function', 'component returns a function')
//   var update = create()
//   t.equal(typeof update, 'function', 'component function returns a function')
//   var element = update()
//   t.ok(element instanceof window.Element, 'renders an element')
//   t.equal(element.outerHTML, '<span>Hello planet!</span>', 'html matches')
// })

// test('renders one-off components', function (t) {
//   t.plan(2)

//   var greeting = component(function (name) {
//     return html`<span>Hello ${name}!</span>`
//   })

//   var res = render(html`
//     <div>
//       ${greeting('planet')}
//       ${greeting('world')}
//     </div>
//   `)

//   t.ok(res instanceof window.Element, 'renders an element')
//   t.equal(res.outerHTML, `<div><span>Hello planet!</span> <span>Hello world!</span></div>`, 'html matches')
// })

// test('updates in-place', function (t) {
//   t.plan(2)

//   var greeting = component(function (name) {
//     return html`<span>Hello ${name}!</span>`
//   })

//   var res = render(html`
//     <body>
//       ${greeting('planet')}
//       ${greeting('world')}
//     </body>
//   `, document.body)

//   t.equal(res, document.body, 'return target')
//   t.equal(res.outerHTML, `<body><span>Hello planet!</span> <span>Hello world!</span></body>`, 'html matches')
// })
