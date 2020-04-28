import assert from 'nanoassert/index.js'
import morph from './morph.js'
import cache from './cache.js'
import Partial from './partial.js'

export default function render (partial, target, context) {
  if (typeof window === 'undefined') return partial
  assert(partial instanceof Partial, 'nanohtml: render should be called with html partial')

  var cached = cache.get(target)
  if (cached instanceof Partial && cached.key === partial.key) {
    partial.render(cached)
    return target
  }

  var res = partial.render()

  var element
  if (target) element = morph(target, res.element)
  else element = res.element
  res.update(partial.values)

  return element
}
