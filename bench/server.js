var nanobench = require('nanobench')

var nanohtmlServer = require('../lib/server')
var createApp = require('./fixtures/app')

nanobench('nanohtml server 10000 iterations', function (b) {
  var app = createApp(nanohtmlServer)
  for (var i = 0; i < 100; i++) app.render().toString()

  b.start()
  for (i = 0; i < 10000; i++) app.render().toString()
  b.end()
})
