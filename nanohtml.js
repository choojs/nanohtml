const hyperx = require('hyperx')
const morph = require('./morph')
const SVG_TAGS = require('./lib/svg-tags')
const BOOL_PROPS = require('./lib/bool-props')
const DIRECT_PROPS = require('./lib/direct-props')

const cache = new WeakMap()
const templates = new WeakMap()

const { TEXT_NODE, COMMENT_NODE } = document
const PLACEHOLDER_INDEX = /\0placeholder(\d+)\0/g
const XLINKNS = 'http://www.w3.org/1999/xlink'
const SVGNS = 'http://www.w3.org/2000/svg'
const COMMENT_TAG = '!--'

exports.html = html
exports.render = render
exports.Partial = Partial
exports.Rendered = Rendered

function html (template, ...values) {
  return new Partial({ template, values })
}

function render (partial, oldNode) {
  var cached = oldNode && cache.get(oldNode)
  if (cached && cached.key === partial.key) {
    update(cached.editors, partial.values)
    return oldNode
  } else {
    const { element, editors } = parse(partial, oldNode)
    update(editors, partial.values)
    if (oldNode && !element.isSameNode(oldNode)) {
      oldNode.parentElement.replaceChild(element, oldNode)
    }
    return element
  }
}

function parse (partial, oldNode) {
  var template = templates.get(partial.template)

  if (!template) {
    var placeholders = partial.values.map(function (v, index) {
      return '\0placeholder' + index + '\0'
    })

    var parser = hyperx(h, {
      comments: true,
      // TODO: add test for fragments, this should just return an array
      createFragment: createFragment
    })

    template = parser.apply(undefined, [partial.template].concat(placeholders))
    templates.set(partial.template, template)
  }

  return template(partial.values, partial.key, oldNode)
}

function Partial ({ template, values }) {
  this.template = template
  this.values = values
  this.key = template
}

function Rendered ({ key, element, editors, bind }) {
  this.key = key
  this.bind = bind
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

    Object.entries(attrs).forEach(function ([name, value]) {
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
        value.replace(PLACEHOLDER_INDEX, function (placeholder) {
          editors.push({
            index: getPlaceholderIndex(placeholder),
            update (_, all) {
              var next = value.replace(PLACEHOLDER_INDEX, function (_, index) {
                return all[index]
              })
              setAttribute(name, next)
            }
          })
        })
      } else {
        setAttribute(name, value)
      }
    })

    var oldChildren = oldNode && Array.from(oldNode.childNodes)
    var newChildren = children.reduce(function (children, child, index) {
      if (typeof child === 'function') child = child(values)

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
      } else if (child instanceof Rendered) {
        children[index] = appendChild(child.element)
        editors.push(...child.editors)
      } else {
        children[index] = child = appendChild(child)
        cache.set(child, new Rendered({
          key: Symbol(index),
          element: child,
          editors: [],
          bind: function (newNode) {
            children[index] = newNode
          }
        }))
      }

      return children

      function createUpdate (cached, oldChild) {
        return function (newChild) {
          if (Array.isArray(newChild)) {
            newChild = newChild.flat(Infinity)
            cached = Array.isArray(cached) ? cached : [cached]
            oldChild = Array.isArray(oldChild) ? oldChild : [oldChild]

            const _cached = []
            const newChildren = newChild.map(function (child, index) {
              if (child instanceof Partial) {
                for (let i = 0, len = cached.length; i < len; i++) {
                  if (cached[i] && cached[i].key === child.key) {
                    update(cached[i].editors, child.values)
                    _cached.push(cached.splice(i, 1, null))
                    return oldChild[i]
                  }
                }
                var old = cached[index] ? null : oldChild[index]
                var res = parse(child, old)
                update(res.editors, child.values)
                _cached.push(res)
                return res.element
              } else {
                _cached.push(null)
                return child
              }
            })

            for (let i = 0, len = oldChild.length; i < len; i++) {
              if (newChildren.includes(oldChild[i])) continue
              element.removeChild(oldChild[i])
            }

            let next = children[index + 1]
            if (Array.isArray(next)) next = next[0]
            for (let i = 0, len = newChildren.length; i < len; i++) {
              if (next) element.insertBefore(newChildren[i], next)
              else element.appendChild(newChildren[i])
            }

            cached = _cached
            children[index] = oldChild = newChildren
          } else if (newChild instanceof Partial) {
            if (cached && newChild.key === cached.key) {
              update(cached.editors, newChild.values)
            } else {
              cached = parse(newChild, oldChild)
              update(cached.editors, newChild.values)
              children[index] = oldChild = replaceChild(cached.element, oldChild)
            }
          } else {
            cached = null
            children[index] = oldChild = replaceChild(newChild, oldChild)
          }
        }
      }

      function appendChild (child, placeholderIndex) {
        var node, candidate

        if (oldNode && element === oldNode) {
          for (let i = 0; i < oldChildren.length; i++) {
            let oldChild = oldChildren[i]
            if (child instanceof Partial) {
              let cached = cache.get(oldChild)
              if (cached && cached.key === child.key) {
                update(cached.editors, child.values)
                oldChildren.splice(i, 1)
                editors.push({
                  index: placeholderIndex,
                  update: createUpdate(cached, oldChild)
                })
                return oldChild
              }
            } else {
              node = node || toNode(child)
              if (!isSame(node, oldChild) || cache.has(oldChild)) continue
              if (node.nodeType === TEXT_NODE) {
                oldChild.nodeValue = node.nodeValue
              } else {
                let cached = cache.get(node)
                if (cached) cached.bind(oldChild)
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
            var cached = cache.get(otherNode)
            return cached.key === child.key
          }

          let editor = {
            index: placeholderIndex,
            update: createUpdate(null, node)
          }

          editors.push(editor)
          cache.set(node, new Rendered({
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
          if (oldChild) {
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
      for (let i = 0, len = oldChildren.length; i < len; i++) {
        oldNode.removeChild(oldChildren[i])
      }
    }

    for (let i = 0, len = newChildren.length; i < len; i++) {
      const newChild = newChildren[i]
      if (Array.isArray(newChild)) {
        for (let i = 0, len = newChild.length; i < len; i++) {
          element.appendChild(newChild[i])
        }
      } else if (newChild) {
        element.appendChild(newChild)
      }
    }

    var res = new Rendered({ key, element, editors, bind })
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
    for (let i = 0, len = child.length; i < len; i++) {
      child[i].remove()
    }
  } else {
    child.remove()
  }
}

function insertBefore (newChild, oldChild) {
  oldChild = Array.isArray(oldChild) ? oldChild[0] : oldChild
  var parent = oldChild.parentElement
  if (Array.isArray(newChild)) {
    for (let i = 0, len = newChild.length; i < len; i++) {
      parent.insertBefore(newChild, oldChild)
    }
  } else {
    parent.insertBefore(newChild, oldChild)
  }
}

function updateChildren (newNode, oldNode) {
  var newChildren = Array.from(newNode.childNodes)
  var oldChildren = Array.from(oldNode.childNodes)

  var prev
  for (let i = 0, len = newChildren.length; i < len; i++) {
    if (!newChildren[i]) continue

    let match
    for (let j = 0, len = oldChildren.length; j < len; j++) {
      if (isSame(newChildren[i], oldChildren[j])) {
        match = oldChildren[j]
        oldChildren.splice(j, 1)
        break
      }
    }

    if (match) {
      const cached = cache.get(newChildren[i])
      if (cached) cached.bind(match)

      if (match.nodeType === TEXT_NODE) {
        match.nodeValue = newChildren[i].nodeValue
      } else {
        morph(newChildren[i], match.outerHTML)
        updateChildren(newChildren[i], match)
      }

      if (prev && prev.nextSibling) {
        oldNode.insertBefore(match, prev.nextSibling)
      } else {
        oldNode.appendChild(match)
      }
      prev = match
    } else {
      if (prev && prev.nextSibling) {
        oldNode.insertBefore(newChildren[i], prev.nextSibling)
      } else {
        oldNode.appendChild(newChildren[i])
      }
      prev = newChildren[i]
    }
  }

  for (let i = 0, len = oldChildren.length; i < len; i++) {
    if (oldChildren[i]) oldNode.removeChild(oldChildren[i])
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
  for (var i = 0, len = nodes.length; i < len; i++) {
    if (nodes[i] == null) continue
    fragment.appendChild(toNode(nodes[i]))
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
      value instanceof RegExp || value instanceof Date) {
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

function update (editors, values) {
  values = values instanceof Partial ? values.values : values
  for (let i = 0, len = editors.length; i < len; i++) {
    const { update, index } = editors[i]
    update(values[index], values)
  }
}
