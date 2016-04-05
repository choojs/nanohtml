var test = require('tape')
var bel = require('../')

test('create inputs', function (t) {
  t.plan(5)

  var expected = 'testing'
  var result = bel`<input type="text" value="${expected}" />`
  t.equal(result.tagName, 'INPUT', 'created an input')
  t.equal(result.value, expected, 'set the value of an input')

  result = bel`<input type="checkbox" checked="${true}" disabled="${false}" />`
  t.equal(result.getAttribute('type'), 'checkbox', 'created a checkbox')
  t.equal(result.getAttribute('checked'), 'checked', 'set the checked attribute')
  t.equal(result.getAttribute('disabled'), null, 'should not have set the disabled attribute')

  t.end()
})

test('can update and submit inputs', function (t) {
  t.plan(2)
  document.body.innerHTML = ''
  var expected = 'testing'
  function render (data, onsubmit) {
    var input = bel`<input type="text" value="${data}" />`
    return bel`<div>
      ${input}
      <button onclick=${function () {
        onsubmit(input.value)
      }}>submit</button>
    </div>`
  }
  var result = render(expected, function onsubmit (newvalue) {
    t.equal(newvalue, 'changed')
    document.body.innerHTML = ''
    t.end()
  })
  document.body.appendChild(result)
  t.equal(document.querySelector('input').value, expected, 'set the input correctly')
  document.querySelector('input').value = 'changed'
  document.querySelector('button').click()
})

test('svg', function (t) {
  t.plan(2)
  var result = bel`<svg width="150" height="100" viewBox="0 0 3 2">
    <rect width="1" height="2" x="0" fill="#008d46" />
  </svg>`
  t.equal(result.tagName, 'svg', 'create svg tag')
  t.equal(result.childNodes[1].tagName, 'rect', 'created child rect tag')
  t.end()
})

test('svg with namespace', function (t) {
  t.plan(3)
  var result
  function create () {
    result = bel`<svg width="150" height="100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2">
      <rect width="1" height="2" x="0" fill="#008d46" />
    </svg>`
  }
  t.doesNotThrow(create)
  t.equal(result.tagName, 'svg', 'create svg tag')
  t.equal(result.childNodes[1].tagName, 'rect', 'created child rect tag')
})

test('style', function (t) {
  t.plan(2)
  var name = 'test'
  var result = bel`<h1 style="color: red">Hey ${name.toUpperCase()}, <span style="color: blue">This</span> is a card!!!</h1>`
  t.equal(result.style.color, 'red', 'set style color on parent')
  t.equal(result.querySelector('span').style.color, 'blue', 'set style color on child')
  t.end()
})

test('adjacent text nodes', function (t) {
  t.plan(2)
  var who = 'world'
  var exclamation = ['!', ' :)']
  var result = bel`<div>hello ${who}${exclamation}</div>`
  t.equal(result.childNodes.length, 1, 'should be merged')
  t.equal(result.outerHTML, '<div>hello world! :)</div>', 'should have correct output')
  t.end()
})
