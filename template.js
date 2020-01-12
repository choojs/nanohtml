var assert = require('assert')
var hyperx = require('hyperx')
var Ref = require('./ref')
var cache = require('./cache')
var Partial = require('./partial')
var SVG_TAGS = require('./lib/svg-tags')
var BOOL_PROPS = require('./lib/bool-props')
var DIRECT_PROPS = require('./lib/direct-props')

var PLACEHOLDER_INDEX = /\0placeholder(\d+)\0/g
var XLINKNS = 'http://www.w3.org/1999/xlink'
var SVGNS = 'http://www.w3.org/2000/svg'
var COMMENT_TAG = '!--'

module.exports = Template

function Template (template, values, tag, props, children) {
  this.key = template
  this.values = values
  this.tag = tag
  this.namespace = null
  this.children = children
  this.props = Object.assign({}, props)

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    this.namespace = SVGNS
  } else if (props.namespace) {
    this.namespace = props.namespace
  }

  if (props.namespace) {
    delete this.props.namespace
  }

  // If we are extending a builtin element
  this.isCustomElement = false
  if (props.is) {
    this.isCustomElement = props.is
    delete this.props.is
  }
}

Template.parse = function parse (template, values) {
  // Create indexed placeholders for all values
  var placeholders = values.map(function (v, index) {
    return '\0placeholder' + index + '\0'
  })

  var parser = hyperx(createTemplate, {
    comments: true,
    createFragment: createFragment
  })

  return parser(template, ...placeholders)

  function createTemplate (tag, props, children) {
    return new Template(template, values, tag, props, children)
  }
}

Template.prototype.render = function render () {
  var key = this.key
  var values = this.values
  var tag = this.tag
  var props = this.props
  var ns = this.namespace
  var children = this.children
  var isCustomElement = this.isCustomElement
  var element
  var editors = []

  // Create the element
  if (ns) {
    if (isCustomElement) {
      element = document.createElementNS(ns, tag, { is: isCustomElement })
    } else {
      element = document.createElementNS(ns, tag)
    }
  } else if (tag === COMMENT_TAG) {
    return document.createComment(props.comment)
  } else if (isCustomElement) {
    element = document.createElement(tag, { is: isCustomElement })
  } else {
    element = document.createElement(tag)
  }

  // Handle element properties, hooking up placeholders
  Object.keys(props).forEach(function (name, i) {
    if (isPlaceholder(name)) {
      editors.push({
        index: getPlaceholderIndex(name),
        update: function (nameValue) {
          setAttribute(nameValue, props[nameValue])
        }
      })
      return
    }
    if (isPlaceholder(props[name])) {
      editors.push({
        index: getPlaceholderIndex(props[name]),
        update: function (value) {
          setAttribute(name, value)
        }
      })
      return
    }
    if (/\0placeholder/.test(props[name])) {
      props[name].replace(PLACEHOLDER_INDEX, function (placeholder) {
        editors.push({
          index: getPlaceholderIndex(placeholder),
          update (_, all) {
            var value = props[name].replace(PLACEHOLDER_INDEX, function (_, index) {
              return all[index]
            })
            setAttribute(name, value)
          }
        })
      })
      return
    }
    setAttribute(name, props[name])
  })

  // Handle element children, generate placeholders and hook up editors
  // There's a lot going on here; We use a reduce to create a scope wherein
  // we can reference the last rendered node (child) and it's siblings.
  // We use the accumulator (children) to keep track of childrens' relative
  // indexes, which is usefull when nodes are removed and added back again.
  children.reduce(function mapChildren (children, child, i) {
    if (isPlaceholder(child)) {
      // Child is a partial
      var index = getPlaceholderIndex(child)
      var partial = values[index]
      child = document.createComment('placeholder')

      // Handle partial
      // If we know upfront that there's going to be a partial in this slot
      // we can expose means to bind the placeholder to an existing updater.
      // This avoids having to re-render an identical element when mounting
      // one view onto another and they e.g. share the same header element.
      if (partial instanceof Partial) {
        // Determine if the placeholder is interchangeable with node
        // Node -> bool
        child.isSameNode = function isSameNode (node) {
          var cached = cache.get(node)
          return cached && cached.key === partial.key
        }

        // Expose interface for binding placeholder to an existing updater
        cache.set(child, new Ref({
          key: partial.key,
          bind (node) {
            var cached = cache.get(node)
            assert(cached, 'nanohtml: cannot bind to uncached node')
            // Replace placeholder updater with existing nodes' updater
            var editor = editors.find((editor) => editor.index === index)
            editor.update = function update (value) {
              var values
              if (value instanceof Partial) {
                // Forward partial values
                values = value.values()
              } else {
                // Wrap value in array
                values = [value]
              }
              return cached.update(values)
            }
          }
        }))
      }

      editors.push({
        index: index,
        update: update
      })
    } else if (child instanceof Template) {
      // Child is an inline child node of element
      var res = child.render()
      if (res && res.element && res.editors) {
        cache.set(res.element, new Ref({
          key: child.key,
          bind: res.bind
        }))
        editors = editors.concat(res.editors)
        child = res.element
      }
    } else {
      // Child is inline content, i.e. TextNode
      child = toNode(child)
      cache.set(child, new Ref({
        key: key,
        bind (node) {
          children[i] = node
        }
      }))
    }

    // Append child
    element.appendChild(child)

    // Update and forward accumulator to the next child
    children[i] = child
    return children

    // Update/render node in-place
    // any -> void
    function update (newChild) {
      var ref = cache.get(child)
      if (newChild instanceof Partial) {
        if (ref instanceof Ref && ref.key === newChild.key && ref.update) {
          return ref.update(newChild.values())
        } else {
          var res = newChild.render()
          res.update(newChild.values())
          newChild = res.element
        }
      }

      if (Array.isArray(newChild)) {
        var oldChildren = Array.isArray(child) ? child.slice() : [child]
        newChild = flatten(newChild).reduce(function mapChild (newChildren, value, index) {
          var match
          if (value instanceof Partial) {
            // Look among siblings for a compatible element
            for (var i = 0, len = oldChildren.length; i < len; i++) {
              match = cache.get(oldChildren[i])
              if (match instanceof Ref && match.key === value.key) {
                // Update matching element
                match.update(value.values())

                // Save updated element
                newChildren.push(oldChildren[i])

                if (i !== index) {
                  var next

                  // Figure out which element should be next sibling
                  if (oldChildren.length - 1 >= index) {
                    next = oldChildren[index]
                  } else {
                    next = newChildren[newChildren.length - 1]
                    next = next && next.nextSibling
                  }

                  // Move matched element into place
                  if (next) {
                    element.insertBefore(oldChildren[i], next)
                  } else {
                    element.appendChild(oldChildren[i])
                  }
                }

                // Drop reference so that it's not updated more than once
                len--
                oldChildren.splice(i, 1)
                return newChildren
              }
            }

            // Create a new element if no match was found
            var res = value.render()
            res.update(value.values())
            if (newChildren.length) {
              // Find next sibling adjacent to previously inserted node
              match = newChildren[newChildren.length - 1]
              match = match && match.nextSibling
            } else if (children.length > i) {
              // Find adjacent child from last update
              match = children.slice(i + 1).find(Boolean)
              if (Array.isArray(match)) match = match[0]
            }

            if (match) {
              element.insertBefore(res.element, match)
            } else {
              element.appendChild(res.element)
            }

            newChildren.push(res.element)
            return newChildren
          }

          value = toNode(child)
          if (child.length >= index) {
            replaceChild(child[index], value)
          } else {
            element.appendChild(value)
          }
          newChildren.push(value)
          return newChildren
        }, [])

        // Remove excess legacy children
        removeChild(oldChildren)
      } else {
        newChild = toNode(newChild)
        if (newChild == null && child) {
          removeChild(child)
        } else if (newChild && child == null) {
          var next = i + 1
          while (next < children.length && children[next] == null) next++
          if (next === children.length) {
            element.appendChild(newChild)
          } else {
            next = children[next]
            if (Array.isArray(next)) next = next[0]
            element.insertBefore(newChild, next)
          }
        } else if (child && newChild) {
          replaceChild(child, newChild)
        }
      }

      // Update references to current child
      children[i] = child = newChild
    }
  }, [])

  return { element, editors, bind }

  // Bind updaters to an existing node
  function bind (node) {
    var cached = cache.get(element)
    if (cached) cache.set(node, cached)
    element = node
  }

  // Set element attribute
  // (str, any) -> void
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
      if (ns) {
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

  // Remove child from element
  // any -> void
  function removeChild (child) {
    if (Array.isArray(child)) {
      while (child.length) {
        element.removeChild(child.pop())
      }
    } else {
      element.removeChild(child)
    }
  }

  // Replace one element with another
  // (Node, Node) -> void
  function replaceChild (oldChild, newChild) {
    if (Array.isArray(oldChild)) {
      while (oldChild.length > 1) {
        element.removeChild(oldChild.pop())
      }
      oldChild = oldChild[0]
    }
    element.replaceChild(newChild, oldChild)
  }
}

// Cast given value to Node
// any -> Node
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

// Wrap nodes in a document fragment
// arr -> DocumentFragment
function createFragment (nodes) {
  var fragment = document.createDocumentFragment()
  for (var i = 0, len = nodes.length; i < len; i++) {
    if (nodes[i] == null) continue
    fragment.appendChild(toNode(nodes[i]))
  }
  return fragment
}

// Recursively flatten an array
// arr -> arr
function flatten (arr) {
  return arr.reduce(function flat (acc, value) {
    if (Array.isArray(value)) {
      return acc.concat(value.reduce(flat, []))
    }
    acc.push(value)
    return acc
  }, [])
}

// Determine wether given value is a placeholder value
// any -> bool
function isPlaceholder (value) {
  return typeof value === 'string' && /^\0placeholder/.test(value)
}

// Get index of given placeholder value
// str -> num
function getPlaceholderIndex (placeholder) {
  return parseInt(placeholder.slice('\0placeholder'.length), 10)
}
