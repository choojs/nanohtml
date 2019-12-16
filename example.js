// [ ] One-off elements
// [ ] Updates in-place
// [ ] No classes
// [ ] Compiles to plain DOM API calls

import { render, html, component } from 'nanohtml'

var state = { href: window.location.pathname }

render(main(state), document.body)

window.onclick = function (event) {
  if (!event.target.href) return
  state.href = event.target.href
  switch (event.target.href) {
    case '/': render(main(state), document.body); break
    case '/page': render(page(state), document.body); break
  }
}

var menu = component(function (href) {
  return html`
    <nav>
      <a href="/" class="${href === '/' ? 'is-selected' : ''}">Home</a>
      <a href="/page" class="${href === '/page' ? 'is-selected' : ''}">Page</a>
    </nav>
  `
})

function main (state) {
  return html`
    <body>
      ${menu(state.href)}
      <h1>Hello planet!</h1>
      ${footer()}
    </body>
  `
}

function page (state) {
  return html`
    <body>
      ${menu(state.href)}
      <h1>Hello page!</h1>
      ${footer()}
    </body>
  `
}

function footer () {
  return html`<footer>© 2019</footer>`
}
