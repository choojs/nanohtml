var test = require('tape')
if (typeof window !== "undefined") {
  var html = require('../../')
} else {
  var { html } = require('./html')
}

test('creates an element', function (t) {
  t.plan(3)
  var button = html`
    <button onclick=${function () { onselected('success') }}>
      click me
    </button>
  `

  var result = html`
    <ul>
      <li>${button}</li>
    </ul>
  `

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
  var result = html`<div className="test1"></div>`
  t.equal(result.className, 'test1')
  result = html`<div class="test2 another"></div>`
  t.equal(result.className, 'test2 another')
  t.end()
})
