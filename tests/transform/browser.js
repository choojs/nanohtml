var html = require('nanohtml')
var test = require('tape')

test('inline objects', function (t) {
  t.plan(1)
  var attributes = { className: 'boop' }
  var el = html`<div ${attributes}></div>`
  var result = el.hasAttribute('class') && el.getAttribute('class') === 'boop'
  t.ok(result, 'attribute added from inline object')
  t.end()
})
