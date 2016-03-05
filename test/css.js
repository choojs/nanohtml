var test = require('tape')
var bel = require('../')

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
