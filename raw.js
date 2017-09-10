var bel = require('.')

function rawCreateElement (tag) {
  if (typeof window !== 'undefined') {
    return browser()
  } else {
    return server()
  }

  function browser () {
    var el = bel`<div></div>`
    el.innerHTML = tag
    return toArray(el.childNodes)
  }

  function server () {
    // eslint-disable-next-line
    var wrapper = new String(tag)
    wrapper.__encoded = true
    return wrapper
  }
}

function toArray (arr) {
  return Array.isArray(arr) ? arr : [].slice.call(arr)
}

module.exports = rawCreateElement
