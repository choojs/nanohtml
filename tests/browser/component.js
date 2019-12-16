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
  document.body.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  render(html`<body><span>Hello ${html`<span>planet</span>`}!</span></body>`, document.body)
  t.equal(document.body.childElementCount, 1, 'same amount of children')
  t.equal(document.body.firstElementChild.childElementCount, 1, 'childrens children mounted')
  t.equal(document.body.firstElementChild.innerText, 'Hello planet!', 'content match')
  t.end()
})

test('updates in place', function (t) {
  document.body.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  render(main('planet'), document.body)
  var content = document.querySelector('.content')
  t.equal(content.innerText, 'planet', 'content mounted')
  render(main('world'), document.body)
  t.equal(content.innerText, 'world', 'content updated')
  t.end()

  function main (text) {
    return html`<body><span>Hello ${html`<span class="content">${text}</span>`}!</span></body>`
  }
})

test('persists in DOM', function (t) {
  document.body.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  render(foo('planet'), document.body)
  var content = document.querySelector('.content')
  t.equal(content.innerText, 'planet', 'content mounted')
  render(bar('world'), document.body)
  t.ok(content.isSameNode(document.querySelector('.content')), 'same node')
  t.equal(content.innerText, 'world', 'content updated')
  t.end()

  function foo (text) {
    return html`<body><span>Hello ${name(text)}!</span></body>`
  }

  function bar (text) {
    return html`<body><span>Hello ${name(text)}!</span></body>`
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
