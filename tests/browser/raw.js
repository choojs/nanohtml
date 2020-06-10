var test = require('tape')
var raw = require('../../raw')
var { html, render } = require('../../')

if (typeof window !== 'undefined') {
  test('unescape html', function (t) {
    t.plan(1)

    var expected = render(html`<span>Hello there</span>`).toString()
    var result = raw('<span>Hello&nbsp;there</span>').toString()

    t.equal(expected, result)
    t.end()
  })
}
