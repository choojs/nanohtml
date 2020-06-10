var nanobench = require('nanobench')

var { render, html } = require('../')
var createApp = require('./fixtures/app')

nanobench('nanohtml browser 10000 iterations', function (b) {
  var app = createApp(html)
  var div = document.createElement('div')

  document.body.appendChild(div)
  for (var i = 0; i < 100; i++) render(app.render(), div)

  b.start()
  for (i = 0; i < 10000; i++) render(app.render(), div)
  b.end()
})
