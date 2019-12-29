var morph = require('nanomorph')
var cache = require('./cache')

module.exports = function render (tmpl, target) {
  if (typeof window === 'undefined') return tmpl
  var res = target && cache.get(target)
  if (res && res.key === tmpl.key) {
    res.update(tmpl.values)
    return target
  }

  res = tmpl.render()

  var element
  if (target) {
    element = morph(target, res.element, { cache })
  } else {
    element = res.element
  }

  res.update(tmpl.values)

  return element
}
