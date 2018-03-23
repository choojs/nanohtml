const yo = require('yo-yo')
const notYoYo = require('not-yo-yo')
import html from 'nanohtml'
import unrelated from 'choo/html'

// Require() call
yo`<a />`
// Should not be converted
notYoYo`<hello world />`
// import with a standard `html` name
html`<b />`
// import with a completely different name
unrelated`<c />`
