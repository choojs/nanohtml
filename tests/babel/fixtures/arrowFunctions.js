// https://github.com/goto-bus-stop/babel-plugin-yo-yoify/issues/14

var html = require('nanohtml')

const component = () => html`
  <div>
    <h1> hello world </h1>
    ${list.map(x => html`<span style="background-color: red; margin: 10px;"> ${x} </span>`)}
  </div>
`
