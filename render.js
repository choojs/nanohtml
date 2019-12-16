var morph = require('nanomorph')
var cache = require('./cache')

module.exports = function render (tmpl, target) {
  if (typeof window === 'undefined') return tmpl
  var res = target && cache.get(target)
  if (res && res.key === tmpl.template) {
    res.update(tmpl.values)
    return target
  }

  res = tmpl.createElement()

  var element
  if (target) element = morph(target, res.element, { cache })
  else element = res.element

  cache.set(element, {
    key: tmpl.template,
    update: res.update
  })

  return element
}
