var test = require('tape')
var $ = require('./')

test('creates an element', function (t) {
  t.plan(2)
  var button = $`<button onclick=${function () {
    el.send('selected', 'success')
  }}>clickme</button>`
  var el = $`<ul>
    <li>${button}</li>
  </ul>`
  el.addEventListener('selected', function (e) {
    t.equal(e.detail, 'success')
    t.end()
  }, false)
  t.equal(el.outerHTML.replace(/[\r\n\s]+/g, ''), '<ul><li><button>clickme</button></li></ul>')
  button.click()
})
