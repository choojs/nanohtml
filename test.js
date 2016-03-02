var test = require('tape')
var $ = require('./')

test('creates an element', function (t) {
  t.plan(3)
  var button = $`<button onclick=${function () {
    onselected('success')
  }}>click me</button>`
  var result = $`<ul>
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
  var result = $`<div className="test1"></div>`
  t.equal(result.className, 'test1')
  result = $`<div class="test2 another"></div>`
  t.equal(result.className, 'test2 another')
  t.end()
})

test('create inputs', function (t) {
  t.plan(4)

  var expected = 'testing'
  var result = $`<input type="text" value="${expected}" />`
  t.equal(result.tagName, 'INPUT', 'created an input')
  t.equal(result.value, expected, 'set the value of an input')

  result = $`<input type="checkbox" checked="${true}" disabled="${false}" />`
  t.equal(result.getAttribute('type'), 'checkbox', 'created a checkbox')
  t.equal(result.getAttribute('checked'), 'checked', 'set the checked attribute')

  t.end()
})
