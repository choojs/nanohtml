const hyperx = require('hyperx')
const morph = require('./morph')
const SVG_TAGS = require('./lib/svg-tags')
const BOOL_PROPS = require('./lib/bool-props')
const DIRECT_PROPS = require('./lib/direct-props')

const cache = new WeakMap()
const pending = new WeakMap()
const templates = new WeakMap()

const PLACEHOLDER_INDEX = /\0placeholder(\d+)\0/g
const XLINKNS = 'http://www.w3.org/1999/xlink'
const SVGNS = 'http://www.w3.org/2000/svg'
const FRAGMENT = Symbol('fragment')
const PENDING = Symbol('pending')
const COMMENT_TAG = '!--'
const TEXT_NODE = 3

exports.html = html
exports.cache = cache
exports.render = render
exports.Partial = Partial
exports.Context = Context

function html (template, ...values) {
  return new Partial({ template, values })
}

function render (partial, oldNode) {
  partial = unwind(partial)

  if (oldNode) pending.delete(oldNode)
  if (isPromise(partial)) {
    if (oldNode) pending.set(oldNode, partial)
    return partial.then(function (res) {
      if (!oldNode || pending.get(oldNode) === partial) {
        return render(res, oldNode)
      }
    })
  }

  var ctx = oldNode && cache.get(oldNode)
  if (ctx && ctx.key === partial.key) {
    partial.update(ctx)
    return oldNode
  }

  ctx = partial.render(oldNode)
  partial.update(ctx)
  if (oldNode && !ctx.element.isSameNode(oldNode)) {
    if (ctx.element instanceof window.DocumentFragment) {
      removeChild(Array.from(oldNode.childNodes))
      oldNode.appendChild(ctx.element)
    } else {
      oldNode.parentElement.replaceChild(ctx.element, oldNode)
    }
  }
  return ctx.element
}

function Partial ({ template, values }) {
  this.template = template
  this.values = values
  this.key = template
}

Partial.prototype.render = function render (oldNode) {
  var { values, key } = this
  var template = templates.get(this.template)

  if (!template) {
    const placeholders = values.map(function toPlaceholder (_, index) {
      return `\0placeholder${index}\0`
    })

    const parser = hyperx(h, {
      comments: true,
      createFragment (nodes) {
        return h(FRAGMENT, {}, nodes)
      }
    })

    template = parser.apply(undefined, [this.template].concat(placeholders))

    if (typeof template === 'string') {
      if (isPlaceholder(template)) {
        // the only child is a partial, e.g. html`${html`<p>Hi</p>`}` or html`${'Hi'}`
        template = h(FRAGMENT, {}, placeholders)
      } else {
        // the only child is text, e.g. html`Hi`
        template = h(FRAGMENT, {}, [template])
      }
    }

    templates.set(this.template, template)
  }

  return template(values, key, oldNode)
}

Partial.prototype.update = function update (ctx) {
  ctx.state.get(PENDING).clear()
  for (const { update, index } of ctx.editors) {
    update(this.values[index], this.values)
  }
}

function Context ({ key, element, editors, bind }) {
  this.key = key
  this.bind = bind
  this.element = element
  this.state = new Map([[PENDING, new Set()]])
  this.isPlaceholder = isPlaceholder(element.nodeValue)
  this.editors = editors.slice().sort((a, b) => a.index - b.index)
}

function h (tag, attrs, children) {
  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    attrs.namespace = SVGNS
  }

  // If we are using a namespace
  var namespace = false
  if (attrs.namespace) {
    namespace = attrs.namespace
    delete attrs.namespace
  }

  // If we are extending a builtin element
  var isCustomElement = false
  if (attrs.is) {
    isCustomElement = attrs.is
    delete attrs.is
  }

  return function template (values, key, oldNode) {
    var element
    if (tag === FRAGMENT) {
      element = document.createDocumentFragment()
    } else if (oldNode && oldNode.tagName === tag.toUpperCase()) {
      element = oldNode
      for (const { name } of element.attributes) {
        if (!(name in attrs)) element.removeAttribute(name)
      }
    } else {
      element = createElement(tag, attrs, { namespace, isCustomElement })
    }

    var editors = []

    Object.entries(attrs).forEach(function handleAttribute ([name, value]) {
      if (isPlaceholder(name)) {
        editors.push({
          index: getPlaceholderIndex(name),
          update (name) {
            setAttribute(name, value)
          }
        })
      } else if (isPlaceholder(value)) {
        editors.push({
          index: getPlaceholderIndex(value),
          update (value) {
            setAttribute(name, value)
          }
        })
      } else if (PLACEHOLDER_INDEX.test(value)) {
        value.replace(PLACEHOLDER_INDEX, function placeholderAttr (match) {
          editors.push({
            index: getPlaceholderIndex(match),
            update (_, all) {
              var next = value.replace(
                PLACEHOLDER_INDEX,
                function updateAttr (_, index) {
                  return all[index]
                }
              )
              setAttribute(name, next)
            }
          })
        })
      } else {
        setAttribute(name, value)
      }
    })

    var oldChildren = oldNode && Array.from(oldNode.childNodes)
    var newChildren = children.reduce(function eachChild (children, child, index) {
      if (typeof child === 'function') child = child(values, key)

      if (isPlaceholder(child)) {
        const placeholderIndex = getPlaceholderIndex(child)
        child = values[placeholderIndex]

        if (child instanceof Partial) {
          children[index] = appendChild(child, placeholderIndex)
        } else {
          child = document.createComment('placeholder')
          children[index] = appendChild(child, placeholderIndex)
          editors.push({
            index: placeholderIndex,
            update: createUpdate(child)
          })
        }
      } else if (child instanceof Context) {
        children[index] = appendChild(child.element)
        editors.push(...child.editors)
      } else {
        children[index] = child = appendChild(child)
        cache.set(child, new Context({
          key: Symbol(index),
          element: child,
          editors: [],
          bind (newNode) {
            children[index] = newNode
          }
        }))
      }

      return children

      function createUpdate (oldChild) {
        return function update (newChild) {
          newChild = unwind(newChild)

          if (Array.isArray(newChild)) {
            newChild = newChild.flat(Infinity)
            oldChild = Array.isArray(oldChild) ? oldChild : [oldChild]

            const newChildren = newChild.map(function (child, index) {
              child = unwind(child)
              if (isPromise(child)) {
                queue(child).then(function (child) {
                  appendInPlace(child, index, newChildren)
                  newChildren[index] = child
                })
                return null
              }
              if (child instanceof Partial) {
                for (let i = 0, len = oldChild.length; i < len; i++) {
                  const ctx = cache.get(oldChild[i])
                  if (ctx && ctx.key === child.key) {
                    child.update(ctx)
                    return oldChild.splice(i, 1)[0]
                  }
                }
                const res = child.render()
                child.update(res)
                return res.element
              }
              return toNode(child)
            })

            newChildren.forEach(appendInPlace)

            for (const el of oldChild) {
              removeChild(el)
            }

            children[index] = oldChild = newChildren
          } else if (isPromise(newChild)) {
            children[index] = oldChild = replaceChild(null, oldChild)
            queue(newChild).then((newChild) => update(newChild))
          } else if (newChild instanceof Partial) {
            let ctx = cache.get(oldChild)
            if (ctx && newChild.key === ctx.key && !ctx.isPlaceholder) {
              newChild.update(ctx)
            } else {
              ctx = newChild.render(oldChild)
              newChild.update(ctx)
              children[index] = oldChild = replaceChild(ctx.element, oldChild)
            }
          } else {
            children[index] = oldChild = replaceChild(newChild, oldChild)
          }
        }

        function appendInPlace (node, _index, _children) {
          if (!node) return
          var prev = getPrevSibling(_children, _index - 1)
          if (!prev) prev = getPrevSibling(children, index - 1)
          var next = prev ? prev.nextSibling : element.children[0]
          if (next && next.isSameNode(node)) return
          if (next) element.insertBefore(node, next)
          else element.appendChild(node)
        }

        function getPrevSibling (nodes, start = nodes.length - 1) {
          var res
          for (let i = start; i >= 0; i--) res = nodes[i]
          if (Array.isArray(res)) return getPrevSibling(res)
          return res
        }
      }

      function appendChild (child, placeholderIndex) {
        var node

        if (oldNode && element === oldNode) {
          for (let i = 0; i < oldChildren.length; i++) {
            let oldChild = oldChildren[i]
            if (child instanceof Partial) {
              node = document.createComment('placeholder')
              const ctx = cache.get(oldChild)
              if (ctx && ctx.key === child.key) {
                oldChildren.splice(i, 1)
                editors.push({
                  index: placeholderIndex,
                  update: createUpdate(oldChild)
                })
                return oldChild
              }
            } else {
              node = node || toNode(child)
              if (!isSame(node, oldChild) || cache.has(oldChild)) continue
              if (node.nodeType === TEXT_NODE) {
                oldChild.nodeValue = node.nodeValue
              } else {
                const ctx = cache.get(node)
                if (ctx) ctx.bind(oldChild)
                morph(node, oldChild)
                updateChildren(node, oldChild)
              }
              oldChildren.splice(i, 1)
              return oldChild
            }
          }
        }

        if (child instanceof Partial) {
          node = document.createComment(`\0placeholder${placeholderIndex}\0`)

          // have placeholder identify as compatible with any element created
          // from the same template
          node.isSameNode = function isSameNode (node) {
            if (!cache.has(node)) return false
            return cache.get(node).key === child.key
          }

          const editor = {
            index: placeholderIndex,
            update: createUpdate(node)
          }
          const ctx = new Context({
            key: child.key,
            element: node,
            editors: [editor],
            bind (newNode) {
              // replace update with updater scoped to the new node
              editor.update = createUpdate(newNode)
            }
          })

          editors.push(editor)
          cache.set(node, ctx)
        }

        node = node || toNode(child)
        if (node) element.appendChild(node)
        return node
      }

      function replaceChild (newChild, oldChild) {
        newChild = toNode(newChild)

        if (newChild === oldChild) {
          return newChild
        } else if (newChild != null) {
          if (oldChild != null) {
            if (newChild.isSameNode) {
              if (Array.isArray(oldChild)) {
                insertBefore(newChild, oldChild)
                removeChild(oldChild)
              } else if (!newChild.isSameNode(oldChild)) {
                element.replaceChild(newChild, oldChild)
              }
            } else {
              insertBefore(newChild, oldChild)
              removeChild(oldChild)
            }
            return newChild
          } else {
            let next = index + 1
            while (next < children.length && children[next] == null) next++
            if (children[next]) {
              // TODO: add tests for update to/from array
              insertBefore(newChild, children[next])
            } else {
              element.appendChild(newChild)
            }
          }
          return newChild
        } else {
          removeChild(oldChild)
          return null
        }
      }
    }, [])

    if (element === oldNode) {
      for (const oldChild of oldChildren) {
        removeChild(oldChild)
      }
    }

    // TODO: optimize, see createUpdate
    for (const newChild of newChildren) {
      if (Array.isArray(newChild)) {
        for (const child of newChild) {
          element.appendChild(child)
        }
      } else if (newChild) {
        element.appendChild(newChild)
      }
    }

    var ctx = new Context({ key, element, editors, bind })
    cache.set(element, ctx)
    return ctx

    function bind (newElement) {
      element = newElement
    }

    function insertBefore (newChild, oldChild) {
      oldChild = Array.isArray(oldChild) ? oldChild[0] : oldChild
      if (Array.isArray(newChild)) {
        for (const child of newChild) {
          element.insertBefore(child, oldChild)
        }
      } else {
        element.insertBefore(newChild, oldChild)
      }
    }

    function setAttribute (name, value) {
      value = unwind(value)

      if (value == null) {
        element.removeAttribute(name)
        return
      }

      if (isPromise(value)) {
        queue(value).then((value) => setAttribute(name, value))
        return
      }

      var key = name.toLowerCase()

      // Normalize className
      if (key === 'classname') {
        key = 'class'
        name = 'class'
      }

      // The for attribute gets transformed to htmlFor, but we just set as for
      if (name === 'htmlFor') name = 'for'

      // If a property is boolean, set itself to the key
      if (BOOL_PROPS.indexOf(key) !== -1) {
        if (String(value) === 'true') value = key
        else if (String(value) === 'false') return
      }

      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on' || DIRECT_PROPS.indexOf(key) !== -1) {
        element[name] = value
      } else {
        if (namespace) {
          if (name === 'xlink:href') {
            element.setAttributeNS(XLINKNS, name, value)
          } else if (/^xmlns($|:)/i.test(name)) {
            // skip xmlns definitions
          } else {
            element.setAttributeNS(null, name, value)
          }
        } else {
          element.setAttribute(name, value)
        }
      }
    }

    function queue (promise) {
      var ctx = cache.get(element)
      var pending = ctx.state.get(PENDING)
      pending.add(promise)
      return new Promise(function (resolve, reject) {
        promise.then(function (value) {
          if (pending.has(promise)) {
            pending.delete(promise)
            resolve(value)
          }
        }, reject)
      })
    }
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

function removeChild (child) {
  if (!child) return
  if (Array.isArray(child)) {
    for (const el of child) el.remove()
  } else {
    child.remove()
  }
}

function updateChildren (newNode, oldNode) {
  var newChildren = Array.from(newNode.childNodes)
  var oldChildren = Array.from(oldNode.childNodes)

  var prev
  for (const newChild of newChildren) {
    if (!newChild) continue

    let match
    for (let i = 0, len = oldChildren.length; i < len; i++) {
      if (isSame(newChild, oldChildren[i])) {
        match = oldChildren[i]
        oldChildren.splice(i, 1)
        break
      }
    }

    if (match) {
      const ctx = cache.get(newChild)
      if (ctx) ctx.bind(match)

      if (match.nodeType === TEXT_NODE) {
        match.nodeValue = newChild.nodeValue
      } else if (!ctx.isPlaceholder) {
        morph(newChild, match)
        updateChildren(newChild, match)
      }

      if (prev && prev.nextSibling) {
        oldNode.insertBefore(match, prev.nextSibling)
      } else {
        oldNode.appendChild(match)
      }
      prev = match
    } else {
      if (prev && prev.nextSibling) {
        oldNode.insertBefore(newChild, prev.nextSibling)
      } else {
        oldNode.appendChild(newChild)
      }
      prev = newChild
    }
  }

  for (const oldChild of oldChildren) {
    if (oldChild) removeChild(oldChild)
  }
}

function createElement (tag, attrs, { namespace, isCustomElement }) {
  if (namespace) {
    if (isCustomElement) {
      return document.createElementNS(namespace, tag, { is: isCustomElement })
    } else {
      return document.createElementNS(namespace, tag)
    }
  } else if (tag === COMMENT_TAG) {
    return document.createComment(attrs.comment)
  } else if (isCustomElement) {
    return document.createElement(tag, { is: isCustomElement })
  } else {
    return document.createElement(tag)
  }
}

function createFragment (nodes) {
  var fragment = document.createDocumentFragment()
  for (const node of nodes) {
    if (node == null) continue
    fragment.appendChild(toNode(node))
  }
  return fragment
}

function toNode (value) {
  var type = typeof value

  if (value == null) {
    return null
  }

  if (type === 'object' && value.nodeType) {
    return value
  }

  if (type === 'function' || type === 'string' || type === 'boolean' ||
      type === 'number' || value instanceof RegExp || value instanceof Date) {
    value = value.toString()
  }

  if (typeof value === 'string') {
    return document.createTextNode(value)
  }

  if (Array.isArray(value)) {
    return createFragment(value)
  }
}

function isSame (a, b) {
  if (a.id) return a.id === b.id
  if (a.isSameNode && a.isSameNode(b)) return true
  if (a.tagName && b.tagName && a.tagName === b.tagName) return true
  if (a.nodeType === TEXT_NODE && b.nodeType === TEXT_NODE) return true
  return false
}

function isPlaceholder (value) {
  return typeof value === 'string' && /^\0placeholder/.test(value)
}

function getPlaceholderIndex (placeholder) {
  return parseInt(placeholder.slice('\0placeholder'.length), 10)
}
