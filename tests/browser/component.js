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
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)
  render(html`<div><span>Hello ${html`<span>planet</span>`}!</span></div>`, div)
  t.equal(div.childElementCount, 1, 'same amount of children')
  t.equal(div.firstElementChild.childElementCount, 1, 'childrens children mounted')
  t.equal(div.firstElementChild.innerText, 'Hello planet!', 'content match')
  document.body.removeChild(div)
  t.end()
})

test('updates in place', function (t) {
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)
  render(main('planet'), div)
  var content = div.querySelector('.content')
  t.equal(content.innerText, 'planet', 'content mounted')
  render(main('world'), div)
  t.equal(content.innerText, 'world', 'content updated')
  document.body.removeChild(div)
  t.end()

  function main (text) {
    return html`<div><span>Hello ${html`<span class="content">${text}</span>`}!</span></div>`
  }
})

test('persists in DOM between mounts', function (t) {
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)
  render(foo('planet'), div)
  var content = div.querySelector('.content')
  render(bar('world'), div)
  t.ok(content.isSameNode(div.querySelector('.content')), 'same node')
  t.equal(content.innerText, 'world', 'content updated')
  document.body.removeChild(div)
  t.end()

  function foo (text) {
    return html`<div><span>Hello ${name(text)}!</span></div>`
  }

  function bar (text) {
    return html`<div><span>Hello ${name(text)}!</span></div>`
  }

  function name (text) {
    return html`<span class="content">${text}</span>`
  }
})

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
