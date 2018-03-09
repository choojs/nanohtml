var nanobench = require('nanobench')

var nanohtmlBrowser = require('../lib/browser')
var createApp = require('./fixtures/app')

nanobench('nanohtml browser 10000 iterations', function (b) {
  var app = createApp(nanohtmlBrowser)
  for (var i = 0; i < 100; i++) app.render().toString()

  b.start()
  for (i = 0; i < 10000; i++) app.render().toString()
  b.end()
})
