import { html, Component, Ref, memo } from 'nanohtml'
import { nanoid } from 'nanoid'

var Player = Component(function (uri, id = memo(nanoid)) {
  var ref = new Ref()

  return html`
    <video src="${uri}" id="${id}" class="${ref}" type="video/mp4"></video>
    <button onclick=${() => ref[id].play()}>Play</button>
  `
})

html`
  <div>
    ${Player('http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')}
  </div>
`
