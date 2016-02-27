var test = require('tape')
var bel = require('./')

test('creates an element', function (t) {
  t.plan(2)
  var button = bel('button.clicker', {
    onclick: function () {
      t.ok(true, 'was clicked')
      t.end()
    },
    innerHTML: 'click me'
  })
  t.equal(button.outerHTML, '<button class="clicker">click me</button>')
  button.click()
})
