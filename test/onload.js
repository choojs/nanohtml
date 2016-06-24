var test = require('tape')
var bel = require('../')
var document = require('global/document')

test('first onload and unload events', function (t) {
  t.plan(2)
  var el = bel`<div onload=${function () {
    t.equal(el.textContent, 'hi', 'fired onload')
  }} onunload=${function () {
    t.equal(el.textContent, 'hi', 'fired onunload')
    t.end()
  }}>hi</div>`
  var result = bel`<div>
    ${el}
  </div>`
  document.body.appendChild(result)
  document.body.removeChild(result)
})
