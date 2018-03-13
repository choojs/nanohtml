import bel from 'bel'

let i = 0

const counter = bel`
  <div>
    ${i++}
    <p>${i++}</p>
    ${i++}
  </div>
`
