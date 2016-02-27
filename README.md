# [bel](https://en.wikipedia.org/wiki/Bel_(mythology))

A simple convenience helper for creating DOM elements with [tagged template strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals).

[![build status](https://secure.travis-ci.org/shama/bel.svg)](https://travis-ci.org/shama/bel)
[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges)

## usage

```js
var $ = require('bel')

// Compose a list of buttons
var list = $`<ul>
  <li>${button(1)}</li>
  <li>${button(2)}</li>
</ul>`

// Add an event listener for actions coming up
list.addEventListener('selected', function (e) {
  alert(`Button ${e.detail} was selected`)
}, false)

// Create buttons that send a "selected" action to the list
function button (num) {
  return $`<button onclick=${function () {
    list.send('selected', num)
  }}>button ${num}</button>`
}

// Use native browser API to append
document.body.appendChild(list)
```

### With DOM diffing
This library uses [hyperscript](https://www.npmjs.com/package/hyperscript) to build
a custom element. If you want to use DOM diffing to insert the element into the
DOM, check out [diffhtml](https://github.com/tbranyen/diffhtml):

```js
var $ = require('bel')
var diff = require('diffhtml')

var count = 0

function render () {
  // Creates a button element
  var button = $`<button onclick=${function () {
    // When the button is clicked, increment count and render again
    count++
    render()
  }}>count ${count}</button>`

  // Renders inside the document.body
  diff.element(document.body, button, { inner: true })
}

render()
```

## similar projects

* [vel](https://github.com/yoshuawuyts/vel)  
  minimal virtual-dom library
* [base-element](https://github.com/shama/base-element)  
  An element authoring library for creating standalone and performant elements
* [virtual-dom](https://github.com/Matt-Esch/virtual-dom)  
  A Virtual DOM and diffing algorithm

# license
(c) 2016 Kyle Robinson Young. MIT License
