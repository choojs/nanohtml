var test = require('tape')
var bel = require('./')

test('creates an element', function (t) {
  t.plan(3)
  var button = bel`<button onclick=${function () {
    onselected('success')
  }}>click me</button>`
  var result = bel`<ul>
    <li>${button}</li>
  </ul>`
  function onselected (result) {
    t.equal(result, 'success')
    t.end()
  }
  t.equal(result.tagName, 'UL')
  t.equal(result.querySelector('button').textContent, 'click me')
  button.click()
})

test('using class and className', function (t) {
  t.plan(2)
  var result = bel`<div className="test1"></div>`
  t.equal(result.className, 'test1')
  result = bel`<div class="test2 another"></div>`
  t.equal(result.className, 'test2 another')
  t.end()
})

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

test('apply css', function (t) {
  t.plan(2)
  var style = {
    position: 'absolute',
    top: 50
  }
  var result = bel`<div style=${style}>test</div>`
  t.equal(result.style.position, 'absolute', 'set position: absolute')
  t.equal(result.style.top, '50px', 'set top: 50px')
  t.end()
})
