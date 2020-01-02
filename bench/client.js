var nanobench = require('nanobench')

var render = require('../render')
var nanoHtml = require('../html')
var createApp = require('./fixtures/app')

nanobench('nanohtml browser 10000 iterations', function (b) {
  var app = createApp(nanoHtml)
  var div = document.createElement('div')

  document.body.appendChild(div)
  for (var i = 0; i < 100; i++) render(app.render(), div)

  b.start()
  for (i = 0; i < 10000; i++) render(app.render(), div)
  b.end()
})
