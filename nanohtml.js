const hyperx = require('hyperx')
const morph = require('./morph')
const SVG_TAGS = require('./lib/svg-tags')
const BOOL_PROPS = require('./lib/bool-props')
const DIRECT_PROPS = require('./lib/direct-props')

const cache = new WeakMap()
const templates = new WeakMap()

const PLACEHOLDER_INDEX = /\0placeholder(\d+)\0/g
const XLINKNS = 'http://www.w3.org/1999/xlink'
const SVGNS = 'http://www.w3.org/2000/svg'
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
  var ctx = oldNode && cache.get(oldNode)
  if (ctx && ctx.key === partial.key) {
    partial.update(ctx)
    return oldNode
  } else {
    const ctx = partial.render(oldNode)
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
      return '\0placeholder' + index + '\0'
    })

    const parser = hyperx(h, {
      comments: true,
      createFragment (nodes) {
        return function (values, key) {
          var children = nodes.map(function (node) {
            if (typeof node === 'function') node = node(values, key)
            return node
          })
          var element = createFragment(children.map(function (child) {
            return child instanceof Context ? child.element : toNode(child)
          }))
          var editors = children.reduce(function (acc, child) {
            if (child instanceof Context) acc.push(...child.editors)
            return acc
          }, [])
          var bind = Function.prototype // TODO: add tests (all children share a key)
          return new Context({ key, element, editors, bind })
        }
      }
    })

    template = parser.apply(undefined, [this.template].concat(placeholders))
    templates.set(this.template, template)
  }

  return template(values, key, oldNode)
}

Partial.prototype.update = function update (ctx) {
  for (const { update, index } of ctx.editors) {
    update(this.values[index], this.values)
  }
}

function Context ({ key, element, editors, bind }) {
  this.key = key
  this.bind = bind
  this.state = new Map()
  this.element = element
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
    if (oldNode && oldNode.tagName === tag.toUpperCase()) {
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
          update: function (name) {
            setAttribute(name, value)
          }
        })
      } else if (isPlaceholder(value)) {
        editors.push({
          index: getPlaceholderIndex(value),
          update: function (value) {
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
            update: createUpdate(null, child)
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
          bind: function (newNode) {
            children[index] = newNode
          }
        }))
      }

      return children

      function createUpdate (ctx, oldChild) {
        return function update (newChild) {
          if (Array.isArray(newChild)) {
            newChild = newChild.flat(Infinity)
            ctx = Array.isArray(ctx) ? ctx : [ctx]
            oldChild = Array.isArray(oldChild) ? oldChild : [oldChild]

            const _ctx = []
            const newChildren = newChild.reduce(function updateChild (_children, child, _index) {
              if (child instanceof Partial) {
                for (let i = 0, len = ctx.length; i < len; i++) {
                  if (ctx[i] && ctx[i].key === child.key) {
                    child.update(ctx[i])
                    _ctx.push(ctx.splice(i, 1, null))
                    child = oldChild[i]
                    break
                  }
                }
                if (child instanceof Partial) {
                  const oldNode = ctx[_index] ? null : oldChild[_index]
                  const res = child.render(oldNode)
                  child.update(res)
                  _ctx.push(res)
                  child = res.element
                }
              } else {
                _ctx.push(null)
              }

              var prev
              // find previous sibling among new children
              for (let i = _index; i >= 0; i--) prev = _children[i]
              if (prev == null) {
                // find previous sibling among element children
                for (let i = index - 1; i >= 0; i--) {
                  prev = children[i]
                  if (Array.isArray(prev)) {
                    // unwind and search through nested arrays of children
                    for (let i = prev.length; i >= 0; i--) {
                      prev = prev[i]
                      if (prev != null) break
                    }
                  }
                  if (prev != null) break
                }
              }

              var next = prev && prev.nextSibling
              if (next) {
                // don't replace with self
                if (!next.isSameNode(child)) {
                  // insert before next sibling
                  element.insertBefore(child, next)
                }
              } else {
                element.appendChild(child)
              }

              _children.push(child)
              return _children
            }, [])

            for (const el of oldChild) {
              if (newChildren.includes(el)) continue
              removeChild(el)
            }

            ctx = _ctx
            children[index] = oldChild = newChildren
          } else if (newChild instanceof Partial) {
            if (ctx && newChild.key === ctx.key) {
              newChild.update(ctx)
              return
            }
            ctx = newChild.render(oldChild)
            newChild.update(ctx)
            children[index] = oldChild = replaceChild(ctx.element, oldChild)
          } else {
            ctx = null
            children[index] = oldChild = replaceChild(newChild, oldChild)
          }
        }
      }

      function appendChild (child, placeholderIndex) {
        var node

        if (oldNode && element === oldNode) {
          for (let i = 0; i < oldChildren.length; i++) {
            let oldChild = oldChildren[i]
            if (child instanceof Partial) {
              let ctx = cache.get(oldChild)
              if (ctx && ctx.key === child.key) {
                child.update(ctx)
                oldChildren.splice(i, 1)
                editors.push({
                  index: placeholderIndex,
                  update: createUpdate(ctx, oldChild)
                })
                return oldChild
              }
            } else {
              node = node || toNode(child)
              if (!isSame(node, oldChild) || cache.has(oldChild)) continue
              if (node.nodeType === TEXT_NODE) {
                oldChild.nodeValue = node.nodeValue
              } else {
                let ctx = cache.get(node)
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
          node = document.createComment('placeholder')
          node.isSameNode = function (otherNode) {
            if (!cache.has(otherNode)) return false
            var ctx = cache.get(otherNode)
            return ctx.key === child.key
          }

          let editor = {
            index: placeholderIndex,
            update: createUpdate(null, node)
          }

          editors.push(editor)
          cache.set(node, new Context({
            key: child.key,
            element: node,
            editors: [editor],
            bind: function (newNode) {
              editor.update = createUpdate(null, newNode)
            }
          }))
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

    for (const newChild of newChildren) {
      if (Array.isArray(newChild)) {
        for (const child of newChild) {
          element.appendChild(child)
        }
      } else if (newChild) {
        element.appendChild(newChild)
      }
    }

    var res = new Context({ key, element, editors, bind })
    cache.set(element, res)
    return res

    function bind (newElement) {
      element = newElement
    }

    function setAttribute (name, value) {
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
  }
}

function removeChild (child) {
  if (!child) return
  if (Array.isArray(child)) {
    for (const el of child) el.remove()
  } else {
    child.remove()
  }
}

function insertBefore (newChild, oldChild) {
  oldChild = Array.isArray(oldChild) ? oldChild[0] : oldChild
  var parent = oldChild.parentElement
  if (Array.isArray(newChild)) {
    for (const child of newChild) {
      parent.insertBefore(child, oldChild)
    }
  } else {
    parent.insertBefore(newChild, oldChild)
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
      } else {
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
