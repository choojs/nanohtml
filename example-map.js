var mapboxgl = require('mapbox-gl')
var { html, render } = require('nanohtml')
var { Component, memo, onupdate, onload } = require('nanohtml/component')

var Map = Component(function ([lng, lat]) {
  var update = onupdate(function (prev) {
    return function beforeupdate (next, map = memo()) {
      if (map && prev.join() !== next.join()) map.panTo(next)
    }
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

render(html`
  <body>
    ${Map([lng, lat])}
  </body>
`, document.body)
