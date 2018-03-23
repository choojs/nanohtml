const html = require('nanohtml')
const yoyo = require('yo-yo')

const a = html`<a id="test">`
const b = yoyo`<b id="test">`
const c = require('choo/html')`<c id="test">`
