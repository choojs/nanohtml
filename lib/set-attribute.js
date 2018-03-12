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
  if (attr.slice(0, 2) === 'on') {
    el[attr] = value
  } else {
    // assume a boolean attribute if the value === true
    // no need to do typeof because "false" would've caused an early return
    if (value === true) value = attr
    el.setAttribute(attr, value)
  }
}
