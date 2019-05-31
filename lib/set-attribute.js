'use strict'

var DIRECT_PROPS = require('./direct-props')

module.exports = function nanohtmlSetAttribute (el, attr, value) {
  if (typeof attr === 'object') {
    for (var i in attr) {
      if (attr.hasOwnProperty(i)) {
        nanohtmlSetAttribute(el, i, attr[i])
      }
    }
    return
  }
  if (!attr) return
  if (attr === 'className') attr = 'class'
  if (attr === 'htmlFor') attr = 'for'
  if (attr.slice(0, 2) === 'on' || DIRECT_PROPS.indexOf(attr) !== -1) {
    el[attr] = value
  } else {
    // assume a boolean attribute if the value === true or false
    if (value === true) value = attr
    if (value === false) return
    el.setAttribute(attr, value)
  }
}
