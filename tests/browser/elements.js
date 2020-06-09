var test = require('tape')
var { html, render } = require('../../nanohtml')

test('create inputs', function (t) {
  var expected = 'testing'
  var result = render(html`<input type="text" value="${expected}" />`)
  t.equal(result.tagName, 'INPUT', 'created an input')
  t.equal(result.value, expected, 'set the value of an input')
  t.end()
})

test('svg', function (t) {
  t.plan(4)
  var result = render(html`<svg width="150" height="100" viewBox="0 0 3 2">
    <rect width="1" height="2" x="0" fill="#008d46" />
    <use xlink:href="#test" />
  </svg>`)
  console.log(result.outerHTML)
  t.equal(result.tagName, 'svg', 'create svg tag')
  t.equal(result.childNodes[0].tagName, 'rect', 'created child rect tag')
  t.equal(result.childNodes[1].getAttribute('xlink:href'), '#test', 'created child use tag with xlink:href')
  t.equal(result.childNodes[1].attributes.getNamedItem('xlink:href').namespaceURI, 'http://www.w3.org/1999/xlink', 'created child use tag with xlink:href')
  t.end()
})

test('svg with namespace', function (t) {
  t.plan(3)
  var result
  function create () {
    result = render(html`<svg width="150" height="100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2">
      <rect width="1" height="2" x="0" fill="#008d46" />
    </svg>`)
  }
  t.doesNotThrow(create)
  t.equal(result.tagName, 'svg', 'create svg tag')
  t.equal(result.childNodes[0].tagName, 'rect', 'created child rect tag')
})

test('svg with xmlns:svg', function (t) {
  t.plan(3)
  var result
  function create () {
    result = render(html`<svg width="150" height="100" xmlns:svg="http://www.w3.org/2000/svg" viewBox="0 0 3 2">
      <rect width="1" height="2" x="0" fill="#008d46" />
    </svg>`)
  }
  t.doesNotThrow(create)
  t.equal(result.tagName, 'svg', 'create svg tag')
  t.equal(result.childNodes[0].tagName, 'rect', 'created child rect tag')
})

test('comments', function (t) {
  var result = render(html`<div><!-- this is a comment --></div>`)
  t.equal(result.outerHTML, '<div><!-- this is a comment --></div>', 'created comment')
  t.end()
})

test('style', function (t) {
  t.plan(2)
  var name = 'test'
  var result = render(html`<h1 style="color: red">Hey ${name.toUpperCase()}, <span style="color: blue">This</span> is a card!!!</h1>`)
  t.equal(result.style.color, 'red', 'set style color on parent')
  t.equal(result.querySelector('span').style.color, 'blue', 'set style color on child')
  t.end()
})

test('adjacent text nodes', function (t) {
  t.plan(2)
  var who = 'world'
  var exclamation = ['!', ' :)']
  var result = render(html`<div>
    hello
    ${who}
      ${exclamation}
  </div>`)
  t.equal(result.childNodes.length, 4, 'should preserve partial')
  t.equal(result.outerHTML, '<div>hello world! :)</div>', 'should have correct output')
  t.end()
})

test('space in only-child text nodes', function (t) {
  t.plan(1)
  var result = render(html`
    <span>
      surrounding
      newlines
    </span>
  `)
  t.equal(result.outerHTML, '<span>surrounding newlines</span>', 'should remove extra space')
  t.end()
})

test('space between text and non-text nodes', function (t) {
  t.plan(1)
  var result = render(html`
    <p>
      <dfn>whitespace</dfn>
      is empty
    </p>
  `)
  t.equal(result.outerHTML, '<p><dfn>whitespace</dfn> is empty</p>', 'should have correct output')
  t.end()
})

test('space between text followed by non-text nodes', function (t) {
  t.plan(1)
  var result = render(html`
    <p>
      whitespace
      <strong>is strong</strong>
    </p>
  `)
  t.equal(result.outerHTML, '<p>whitespace <strong>is strong</strong></p>', 'should have correct output')
  t.end()
})

test('space around text surrounded by non-text nodes', function (t) {
  t.plan(1)
  var result = render(html`
    <p>
      <strong>I agree</strong>
      whitespace
      <strong>is strong</strong>
    </p>
  `)
  t.equal(result.outerHTML, '<p><strong>I agree</strong> whitespace <strong>is strong</strong></p>', 'should have correct output')
  t.end()
})

test('space between non-text nodes', function (t) {
  t.plan(1)
  var result = render(html`
    <p>
      <dfn>whitespace</dfn>
      <em>is beautiful</em>
    </p>
  `)
  t.equal(result.outerHTML, '<p><dfn>whitespace</dfn> <em>is beautiful</em></p>', 'should have correct output')
  t.end()
})

test('space in <pre>', function (t) {
  t.plan(1)
  var result = render(html`
    <pre>
      whitespace is empty
    </pre>
  `)
  t.equal(result.outerHTML, '<pre>\n      whitespace is empty\n    </pre>', 'should preserve space')
  t.end()
})

test('space in <textarea>', function (t) {
  t.plan(1)
  var result = render(html`
    <textarea> Whitespace at beginning 
      middle
      and end </textarea>
  `)
  t.equal(result.outerHTML, '<textarea> Whitespace at beginning \n      middle\n      and end </textarea>', 'should preserve space')
  t.end()
})

test('class is set correctly', function (t) {
  var div = render(html`<div className="test"></div>`)
  t.equal(div.className, 'test', 'class attribute set')
  t.end()
})

test('boolean and direct props are set correctly', function (t) {
  var input = render(html`<input type="checkbox" disabled hidden=${false} indeterminate=${true} required=${null}></input>`)
  t.equal(input.getAttribute('hidden'), null, 'false bool prop not set')
  t.equal(input.getAttribute('disabled'), 'disabled', 'bool prop set to key')
  t.equal(input.getAttribute('indeterminate'), null, 'direct prop is not an attribute')
  t.ok(input.indeterminate, 'direct prop is set')
  t.equal(input.required, false, 'does not assign null to attributes')
  t.end()
})

test('for attribute is set correctly', function (t) {
  t.plan(1)
  var result = render(html`<div>
    <input type="file" name="file" id="heyo" />
    <label for="heyo">label</label>
  </div>`)
  t.ok(result.outerHTML.indexOf('<label for="heyo">label</label>') !== -1, 'contains for="heyo"')
  t.end()
})

test('allow objects to be passed', function (t) {
  t.plan(1)
  var result = render(html`<div>
    <div ${{ foo: 'bar' }}>hey</div>
  </div>`)
  t.ok(result.outerHTML.indexOf('<div foo="bar">hey</div>') !== -1, 'contains foo="bar"')
  t.end()
})

test('allow mixed partial attribute names', function (t) {
  t.plan(1)
  var result = render(html`<div data-${'type'}="greeting">hey</div>`)
  t.equal(result.outerHTML, '<div data-type="greeting">hey</div>', 'data attribute set')
  t.end()
})

test('supports extended build-in elements', function (t) {
  t.plan(1)

  var originalCreateElement = document.createElement
  var optionsArg

  // this iife is a must to avoid illegal invocation type errors, caused by transformed nanohtml tests
  (function () {
    document.createElement = function () {
      optionsArg = arguments[1]
      return originalCreateElement.apply(this, arguments)
    }
  })()

  ;render(html`<div is="my-div"></div>`)

  t.ok(typeof optionsArg === 'object' && optionsArg.is === 'my-div', 'properly passes optional extends object')

  // revert to original prototype method
  delete document.createElement

  t.end()
})
