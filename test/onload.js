var test = require('tape')
var bel = require('../')
var document = require('global/document')

test('fire onload and unload events', function (t) {
  t.plan(2)
  var element = bel`<div onload=${function (el) {
    t.equal(el.textContent, 'hi', 'fired onload')
  }} onunload=${function (el) {
    t.equal(el.textContent, 'hi', 'fired onunload')
    t.end()
  }}>hi</div>`
  var result = bel`<div>
    ${element}
  </div>`
  document.body.appendChild(result)
  document.body.removeChild(result)
})
