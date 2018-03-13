import bel from 'bel'

const child = bel`
  <h1>Page header</h1>
`

const header = bel`
  <header>${child}</header>
`
