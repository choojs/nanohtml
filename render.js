var morph = require('nanomorph')
var cache = require('./cache')

module.exports = function render (tmpl, target) {
  if (typeof window === 'undefined') return tmpl
  var ref = target && cache.get(target)
  if (ref && ref.key === tmpl.key) {
    ref.update(tmpl.values())
    return target
  }

  var res = tmpl.render()

  var element
  if (target) {
    element = morph(target, res.element, { cache })
  } else {
    element = res.element
  }

  res.update(tmpl.values())

  return element
}
