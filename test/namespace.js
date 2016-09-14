var test = require('tape')
var bel = require('../')

test('create namespaced elements', function (t) {
  t.plan(2)
  var expected = 'testing'
  var result = bel`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">
    <use xlink:href="#test"></use>
  </svg>`
  document.body.appendChild(result)
  t.equal(result.namespaceURI, 'http://www.w3.org/1999/xhtml')
  t.equal(result.querySelector('use').outerHTML, '<use xlink:href="#test"></use>')
  document.body.removeChild(result)
  t.end()
})
