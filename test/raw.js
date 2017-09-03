var test = require('tape')
var raw = require('../raw')

test('escape html', function (t) {
  t.plan(1)

  var expected = '<span>Hello&nbsp;there</span>'
  var result = raw('<span>Hello&nbsp;there</span>')

  t.equal(expected, result)
  t.end()
})
