import { html, Component, memo, onupdate, onload } from 'nanohtml'
import mapboxgl from 'mapbox-gl'

var Map = Component(function ([lng, lat]) {
  var update = onupdate(function (next, map = memo()) {
    if (map && (next[0] !== lng || next[1] !== lat)) map.panTo(next)
  })

  onload(function (el) {
    var map = new mapboxgl.Map({
      container: el,
      center: [lng, lat],
      style: 'mapbox://styles/mapbox/streets-v11'
    })
    var onresize = map.resize.bind(map)

    update([lng, lat], map)
    window.addEventListener('resize', onresize)

    return function unload () {
      map.remove()
      window.removeEventListener('resize', onresize)
    }
  })

  return html`<div></div>`
})

html`
  <body>
    ${Map([lng, lat])}
  </body>
`
