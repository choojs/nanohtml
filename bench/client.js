var nanobench = require('nanobench')

var render = require('../render')
var nanoHtml = require('../') // old
var nanoHtmlNext = require('../html') // new
var morph = require('nanomorph')
var createApp = require('./fixtures/app')

nanobench('nanohtml browser 10000 iterations', function (b) {
  var app = createApp(nanoHtml)
  var div = document.createElement('div')

  document.body.appendChild(div)
  for (var i = 0; i < 100; i++) morph(div, app.render())

  b.start()
  for (i = 0; i < 10000; i++) morph(div, app.render())
  b.end()
})

nanobench('nanohtml (next) browser 10000 iterations', function (b) {
  var app = createApp(nanoHtmlNext)
  var div = document.createElement('div')

  document.body.appendChild(div)
  for (var i = 0; i < 100; i++) render(app.render(), div)

  b.start()
  for (i = 0; i < 10000; i++) render(app.render(), div)
  b.end()
})
