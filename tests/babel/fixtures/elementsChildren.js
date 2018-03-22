import html from 'nanohtml'

const child = html`
  <h1>Page header</h1>
`

const header = html`
  <header>${child}</header>
`
