// https://github.com/goto-bus-stop/babel-plugin-yo-yoify/issues/14

var bel = require('bel')

const component = () => bel`
  <div>
    <h1> hello world </h1>
    ${list.map(x => bel`<span style="background-color: red; margin: 10px;"> ${x} </span>`)}
  </div>
`
