'use strict'

function nanohtmlRawBrowser (tag) {
  var el = document.createElement('div')
  el.innerHTML = tag
  return Array.from(el.childNodes)
}

module.exports = nanohtmlRawBrowser
