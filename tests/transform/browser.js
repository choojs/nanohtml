var bel = require('bel')
var test = require('tape')

test('inline objects', function (t) {
  t.plan(1)
  var attributes = { className: 'boop' }
  var el = bel`<div ${attributes}></div>`
  var result = el.hasAttribute('class') && el.getAttribute('class') === 'boop'
  t.ok(result, 'attribute added from inline object')
  t.end()
})
