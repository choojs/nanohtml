# [bel](https://en.wikipedia.org/wiki/Bel_(mythology))

A simple convenience helper for creating native DOM elements.

[![build status](https://secure.travis-ci.org/shama/bel.svg)](https://travis-ci.org/shama/bel)
[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges)

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

## similar projects

* [vel](https://github.com/yoshuawuyts/vel)  
  minimal virtual-dom library
* [base-element](https://github.com/shama/base-element)  
  An element authoring library for creating standalone and performant elements
* [virtual-dom](https://github.com/Matt-Esch/virtual-dom)  
  A Virtual DOM and diffing algorithm

# license
(c) 2016 Kyle Robinson Young. MIT License
