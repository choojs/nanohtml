var { html, render } = require('nanohtml')
var { Component, Ref } = require('nanohtml/component')

var Player = Component(function (uri) {
  var ref = new Ref()

  return html`
    <video src="${uri}" id="player" class="${ref}" type="video/mp4"></video>
    <button onclick=${() => ref.player.play()}>Play</button>
  `
})

render(html`
  <body>
    ${Player('http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')}
  </body>
`, document.body)
