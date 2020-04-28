import { html, Component, memo } from 'nanohtml'
import choo from 'choo/memo'

var Breadcrumbs = Component(function ({ state } = memo(choo)) {
  return html`
    <ol>
      ${state.href.split('/').map((part, index, list) => html`
        <li>
          <a href="${list.slice(0, index + 1).join('/') || '/'}">${part || 'Home'}</a>
        </li>
      `)}
    </ol>
  `
})

html`
  <body>
    ${Breadcrumbs()}
  </body>
`
