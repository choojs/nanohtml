const { Partial, Context } = require('./nanohtml')

module.exports = Lazy

function Lazy (primary, fallback) {
  if (!(this instanceof Lazy)) {
    primary = unwind(primary)
    if (primary == null) return fallback()
    if (!isPromise(primary)) return primary
    return new Lazy(primary, fallback)
  }

  fallback = fallback()
  if (fallback instanceof Partial) {
    this.key = fallback.key
    this.partial = fallback
  } else {
    this.key = Symbol('nanohtml/lazy')
  }

  this.primary = primary
  this.fallback = fallback
}

Lazy.prototype = Object.create(Partial.prototype)
Lazy.prototype.constructor = Lazy

Lazy.prototype.render = function (oldNode) {
  var { primary, fallback } = this

  var ctx
  if (fallback instanceof Partial) {
    ctx = fallback.render(oldNode)
    oldNode = ctx.element
  } else {
    oldNode = toNode(fallback)
    ctx = new Context({
      key: this.key,
      element: oldNode,
      editors: [],
      bind (newNode) {
        oldNode = newNode
      }
    })
  }

  ctx.queue(primary).then((res) => {
    if (res instanceof Partial) {
      var ctx = res.render(oldNode)
      this.partial = res
      this.key = res.key
      res.update()
    } else {

    }
  }).catch((err) => {
    var newNode = fallback(err)
    oldNode.parentNode.replaceChild()
  })

  return ctx
}

Lazy.prototype.update = function (ctx) {
  if (this.partial) {
    this.partial.update(ctx)
  }
}

function unwind (obj, value) {
  if (isGenerator(obj)) {
    const res = obj.next(value)
    if (res.done) return res.value
    if (isPromise(res.value)) {
      return res.value.then(unwind).then((val) => unwind(obj, val))
    }
    return unwind(obj, res.value)
  } else if (isPromise(obj)) {
    return obj.then(unwind)
  }
  return obj
}

function isPromise (obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'
}

function isGenerator (obj) {
  return obj && typeof obj.next === 'function' && typeof obj.throw === 'function'
}
