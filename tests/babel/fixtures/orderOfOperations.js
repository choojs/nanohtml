import html from 'nanohtml'

let i = 0

const counter = html`
  <div>
    ${i++}
    <p>${i++}</p>
    ${i++}
  </div>
`
