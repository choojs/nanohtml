import { html, Component, memo, onupdate } from 'nanohtml'

var Awake = Component(function (time = memo(5000)) {
  var update = onupdate(function (time = memo()) {
    if (time > 0) {
      var timeout = setTimeout(function () {
        update(time - 1000)
      }, 1000)
    }

    return function () {
      clearTimeout(timeout)
    }
  })

  return html`
    <h1>Stay awake!</h1>
    <p>You have to click within ${Math.floor(time / 1000)} seconds</p>
    ${time > 0 ? html`
      <button onclick=${() => update(5000)}>Click me!</button>
    ` : html`
      <p>Too slow!</p>
    `}
  `
})

html`
  <div>
    ${Awake()}
  </div>
`
