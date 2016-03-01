var test = require('tape')
var $ = require('./')

test('creates an element', function (t) {
  t.plan(2)
  var button = $`<button onclick=${function () {
    onselected('success')
  }}>clickme</button>`
  var el = $`<ul>
    <li>${button}</li>
  </ul>`
  function onselected (result) {
    t.equal(result, 'success')
    t.end()
  }
  t.equal(el.outerHTML.replace(/[\r\n]+/g, ''), '<ul id="e1">    <li><button id="e0">clickme</button></li>  </ul>')
  button.click()
})
