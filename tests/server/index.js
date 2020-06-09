var test = require('tape')
var html = require('../../')
var raw = require('../../raw')

test('server side render', function (t) {
  t.plan(2)
  var element = html`<div class="testing">
    <h1>hello!</h1>
  </div>`
  var result = element.toString()
  t.ok(result.indexOf('<h1>hello!</h1>') !== -1, 'contains a child element')
  t.ok(result.indexOf('<div class="testing">') !== -1, 'attribute gets set')
  t.end()
})

test('passing another element to html on server side render', function (t) {
  t.plan(1)
  var button = html`<button>click</button>`
  var element = html`<div class="testing">
    ${button}
  </div>`
  var result = element.toString()
  t.ok(result.indexOf('<button>click</button>') !== -1, 'button rendered correctly')
  t.end()
})

test('style attribute', function (t) {
  t.plan(1)
  var name = 'test'
  var result = html`<h1 style="color: red">Hey ${name.toUpperCase()}, <span style="color: blue">This</span> is a card!!!</h1>`
  var expected = '<h1 style="color: red">Hey TEST, <span style="color: blue">This</span> is a card!!!</h1>'
  t.equal(result.toString(), expected)
  t.end()
})

test('unescape html', function (t) {
  t.plan(1)

  var expected = '<span>Hello <strong>there</strong></span>'
  var result = raw('<span>Hello <strong>there</strong></span>').toString()

  t.equal(result, expected)
  t.end()
})

test('unescape html inside html', function (t) {
  t.plan(1)

  var expected = '<span>Hello <strong>there</strong></span>'
  var result = html`${raw('<span>Hello <strong>there</strong></span>')}`.toString()

  t.equal(result, expected)
  t.end()
})

test('quote attributes', function (t) {
  t.plan(1)

  var title = 'greeting'
  var expected = '<span title="greeting">Hello there</span>'
  var result = html`<span title=${title}>Hello there</span>`.toString()

  t.equal(result, expected)
  t.end()
})

test('respect query parameters', function (t) {
  t.plan(1)

  var param = 'planet'
  var expected = '<a href="/hello?query=planet">Hello planet</a>'
  var result = html`<a href="/hello?query=${param}">Hello ${param}</a>`.toString()

  t.equal(result, expected)
  t.end()
})

test('event attribute', function (t) {
  t.plan(1)

  var expected = '<div onmouseover="" onmouseout="">Hello</div>'
  var result = html`<div onmouseover=${onmouseover} onmouseout="${onmouseout}">Hello</div>`.toString()

  t.equal(result, expected)
  t.end()

  function onmouseover () {}
  function onmouseout () {}
})

test('boolean attribute', function (t) {
  t.plan(1)

  var expected = '<input disabled="disabled" aria-selected="true">'
  var result = html`<input disabled=${true} autofocus=${false} aria-selected="${true}">`.toString()

  t.equal(result, expected)
  t.end()
})

test('spread attributes', function (t) {
  t.plan(1)

  var expected = '<div class="abc" id="def">Hello</div>'
  var props = { class: 'abc', id: 'def' }
  var result = html`<div ${props}>Hello</div>`.toString()

  t.equal(result, expected)
  t.end()
})

test('multiple root elements', function (t) {
  t.plan(1)

  var expected = '<div>1</div><div>2</div>3<div>5</div>'
  var result = html`<div>1</div><div>2</div>3<div>5</div>`.toString()

  t.equal(expected, result)
  t.end()
})

test('nested multiple root elements', function (t) {
  t.plan(1)

  var expected = '<div>1</div><div>2</div><div>3</div><div>4</div>'
  var result = html`<div>1</div>${html`<div>2</div><div>3</div>`}<div>4</div>`.toString()

  t.equal(expected, result)
  t.end()
})

test('resolves generators', function (t) {
  var expected = '<div>Hello <span>planet</span></div>'
  var result = html`<div>Hello ${html`<span>${child()}</span>`}</div>`
  t.equal(result.toString(), expected)
  t.end()

  function * child () {
    var value = yield 'planet'
    return value
  }
})

test('resolves promises', function (t) {
  t.plan(2)
  var expected = '<div class="greeting">Hello <span>planet</span></div>'
  var result = html`<div class="${Promise.resolve('greeting')}">Hello ${Promise.resolve(html`<span>${[Promise.resolve('planet')]}</span>`)}</div>`
  t.ok(result instanceof Promise, 'returns promise')
  result.then(function (result) {
    t.equal(result.toString(), expected)
  })
})

test('resolves generators with promises', function (t) {
  t.plan(2)
  var expected = '<div class="greeting">Hello <span>planet</span></div>'
  var result = html`<div class="${Promise.resolve('greeting')}">Hello ${html`<span>${child()}</span>`}</div>`
  t.ok(result instanceof Promise, 'returns promise')
  result.then(function (result) {
    t.equal(result.toString(), expected)
  })

  function * child () {
    var value = yield Promise.resolve('planet')
    return value
  }
})
