var test = require('tape')
var bel = require('../')

test('server side render', function (t) {
  t.plan(2)
  var element = bel`<div class="testing">
    <h1>hello!</h1>
  </div>`
  var result = element.toString()
  t.ok(result.indexOf('<h1>hello!</h1>') !== -1, 'contains a child element')
  t.ok(result.indexOf('<div class="testing">') !== -1, 'attribute gets set')
  t.end()
})
