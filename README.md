# bel

A simple convenience helper for creating native DOM elements.

## usage

```js
var bel = require('bel')
var element = bel('button.clicker', {
  onclick: function () {
    element.innerHTML = 'I have been clicked!'
  },
  innerHTML: 'Click me'
})
document.body.appendChild(element)
```

Where natively you would do:

```js
var element = document.createElement('button')
element.className = 'clicker'
element.addEventListener('click', function () {
  element.innerHTML = 'I have been clicked!'
}, false)
element.innerHTML = 'Click me'
document.body.appendChild(element)
```

### custom events

Also includes a convenience helper for custom events:

```js
var send = require('bel/send')
var element = bel('button.clicker', {
  onclick: function () {
    send(element, 'selected', 'I have been clicked!')
  },
  innerHTML: 'Click me'
})

// ...

element.addEventListener('selected', function (e) {
  element.innerHTML = e.detail
})
```

### usage with [diffhtml](https://github.com/tbranyen/diffhtml)

This creates native elements so if you're using a DOM diffing library that works
with native elements, like `diffhtml`, you can do the following:

```js
var bel = require('bel')
var send = require('bel/send')
var diff = require('diffhtml')

var ul = bel('ul')

function render (items) {
  items.forEach(function (item) {
    var li = bel('li', {
      onclick: function () {
        send(ul, 'selected', item.id)
      },
      innerHTML: item.name
    })
    // Add each li to the parent ul
    diff.element(ul, li, { inner: true })
  })
  // Add ul to document.body
  diff.element(document.body, ul)
}

// Render to the DOM
render([
  { id: 1, name: 'Grizzly' },
  { id: 2, name: 'Polar' }
  { id: 3, name: 'Brown' }
])

// Listen for the selected event
ul.addEventListener('selected', function (e) {
  console.log(e.detail + ' has been selected')
})
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
