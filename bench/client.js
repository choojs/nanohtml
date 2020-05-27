var nanobench = require('nanobench')

var oldHtml = require('../') // old
var { render, html } = require('../nanohtml') // new
var morph = require('nanomorph')
var createApp = require('./fixtures/app')

nanobench('nanohtml browser 10000 iterations', function (b) {
  var app = createApp(oldHtml)
  var div = document.createElement('div')

  document.body.appendChild(div)
  for (var i = 0; i < 100; i++) morph(div, app.render())

  b.start()
  for (i = 0; i < 10000; i++) morph(div, app.render())
  b.end()
})

nanobench('nanohtml (next) browser 10000 iterations', function (b) {
  var app = createApp(html)
  var div = document.createElement('div')

  document.body.appendChild(div)
  for (var i = 0; i < 100; i++) render(app.render(), div)

  b.start()
  for (i = 0; i < 10000; i++) render(app.render(), div)
  b.end()
})
