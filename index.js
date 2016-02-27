var document = require('global/document')
var parseTag = require('./parse-tag.js')

module.exports = function bel (tag, props) {
  tag = tag || 'div'
  if (typeof tag !== 'string') {
    props = tag
    tag = 'div'
  }
  props = props || {}
  tag = parseTag(tag, props)
  var el = document.createElement(tag)
  var propKeys = Object.keys(props)
  propKeys.forEach(function (name) {
    var prop = props[name]
    if (name.slice(0, 2) === 'on') {
      el.addEventListener(name.slice(2), function () {
        return prop.call(this, Array.prototype.slice.call(arguments))
      }, false)
    } else {
      el[name] = prop
    }
  })
  return el
}
