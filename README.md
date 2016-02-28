# [bel](https://en.wikipedia.org/wiki/Bel_(mythology))

A simple library for composable DOM elements using [tagged template strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals).

[![build status](https://secure.travis-ci.org/shama/bel.svg)](https://travis-ci.org/shama/bel)
[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges)

## usage

### A Simple Element

Create the the element:

```js
// list.js
var $ = require('bel')

module.exports = function (items) {
  return $`<ul>
    ${items.map(function (item) {
      return $`<li>${item}</li>`
    })}
  </ul>`
}
```

Then pass data to it and add to your page:

```js
// app.js
var list = require('./list.js')
var element = list([
  'grizzly',
  'polar',
  'brown'
])
document.body.appendChild(element)
```

### Data Down, Events Up

```js
// list.js
var $ = require('bel')

// The DOM is built by the data passed in
module.exports = function (items) {
  function render () {
    return $`<ul>
    ${items.map(function (item) {
      return $`<li>${button(item.id, item.label)}</li>`
    })}
    </ul>`
  }
  function button (id, label) {
    return $`<button onclick=${function () {
      // Then events get sent up
      element.send('selected', id)
    }}>${label}</button>`
  }
  var element = render()
  return element
}
```

```js
// app.js
var $ = require('bel')
var createList = require('./list.js')

module.exports = function (bears) {
  var list = createList(bears)
  list.addEventListener('selected', function (e) {
    // When a bear is selected, rerender with the newly selected item
    // This will use DOM diffing to render, sending the data back down again
    element.rerender(render(e.detail))
  }, false)
  function render (selected) {
    return $`<div className="app">
      <h1>Selected: ${selected}</h1>
      ${list}
    </div>`
  }
  // By default we havent selected anything
  var element = render('none')
  return element
}
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
