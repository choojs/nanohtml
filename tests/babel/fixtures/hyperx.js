// The example from the https://github.com/substack/hyperx readme,
// but with bel.
var bel = require('bel')

var title = 'world'
var wow = [1,2,3]

var tree = bel`<div>
  <h1 y="ab${1+2}cd">hello ${title}!</h1>
  ${bel`<i>cool</i>`}
  wow
  ${wow.map(function (w) {
    return bel`<b>${w}</b>\n`
  })}
</div>`

console.log(tree.outerHTML)

