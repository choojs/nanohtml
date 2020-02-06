var assert = require('assert')
var hyperx = require('hyperx')
var Ref = require('./ref')
var cache = require('./cache')
var Partial = require('./partial')
var Component = require('./component')
var SVG_TAGS = require('./lib/svg-tags')
var BOOL_PROPS = require('./lib/bool-props')
var DIRECT_PROPS = require('./lib/direct-props')

var PLACEHOLDER_INDEX = /\0placeholder(\d+)\0/g
var XLINKNS = 'http://www.w3.org/1999/xlink'
var SVGNS = 'http://www.w3.org/2000/svg'
var COMMENT_TAG = '!--'

var templates = new WeakMap()

module.exports = parse

/**
 * Parse a partial object into element and associated utilities
 * @param {Partial} partial
 */
function parse (partial) {
  var template = templates.get(partial.template)
  if (!template) {
    // Create indexed placeholders for all values
    var placeholders = partial.values.map(function (v, index) {
      return '\0placeholder' + index + '\0'
    })

    var parser = hyperx(function createTemplate (tag, props, children) {
      return new Template(partial, tag, props, children)
    }, {
      comments: true,
      createFragment: createFragment
    })

    template = parser.apply(undefined, [partial.template].concat(placeholders))
    templates.set(partial.template, template)
  }

  // Render element from template
  var res = template.render()

  // Cache element utilities
  cache.set(res.element, new Ref(partial, res.bind, update))

  // Sort updaters by index
  var updaters = res.editors.sort(function (a, b) {
    return a.index - b.index
  }).map(function (editor) {
    return function update () {
      return editor.update.apply(editor, arguments)
    }
  })

  return { element: res.element, update: update }

  /**
   * Run all updaters in order with given values
   * @param {Array} values List of values per updater
   */
  function update (values) {
    assert(Array.isArray(values), 'values should be type array')
    assert.equal(values.length, updaters.length, 'nanohtml: number of values (' + values.length + ') must match number of slots (' + updaters.length + ')')
    for (var i = 0, len = values.length; i < len; i++) {
      updaters[i](values[i], values)
    }
  }
}

/**
 * Parsed template litteral for producing new elements
 * @param {Partial} partial The source partial
 * @param {String} tag Element type
 * @param {Object} props Element attributes
 * @param {Array} children Element children
 */
function Template (partial, tag, props, children) {
  this.partial = partial
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

Template.prototype.render = function render () {
  var element
  var self = this
  var editors = []

  // Create the element
  if (this.namespace) {
    if (this.isCustomElement) {
      element = document.createElementNS(this.namespace, this.tag, {
        is: this.isCustomElement
      })
    } else {
      element = document.createElementNS(this.namespace, this.tag)
    }
  } else if (this.tag === COMMENT_TAG) {
    return document.createComment(this.props.comment)
  } else if (this.isCustomElement) {
    element = document.createElement(this.tag, { is: this.isCustomElement })
  } else {
    element = document.createElement(this.tag)
  }

  // Handle element properties, hooking up placeholders
  Object.keys(this.props).forEach(function (name, i) {
    var value = self.props[name]
    if (isPlaceholder(name)) {
      editors.push({
        index: getPlaceholderIndex(name),
        update: function (nameValue) {
          setAttribute(nameValue, self.props[nameValue])
        }
      })
      return
    }
    if (isPlaceholder(value)) {
      editors.push({
        index: getPlaceholderIndex(value),
        update: function (value) {
          setAttribute(name, value)
        }
      })
      return
    }
    if (/\0placeholder/.test(value)) {
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
      return
    }
    setAttribute(name, value)
  })

  // Handle element children, generate placeholders and hook up editors
  // There's a lot going on here; We use a reduce to create a scope wherein
  // we can reference the last rendered node (child) and it's siblings.
  // We use the accumulator (children) to keep track of childrens' relative
  // indexes, which is usefull when nodes are removed and added back again.
  this.children.reduce(function mapChildren (children, child, i) {
    if (isPlaceholder(child)) {
      // Child is a partial
      var index = getPlaceholderIndex(child)
      var partial = self.partial.values[index]
      child = document.createComment('placeholder')

      if (partial instanceof Component) {
        partial = partial.render()
      }

      // Handle partial
      // If we know upfront that there's going to be a partial in this slot
      // we can expose means to bind the placeholder to an existing updater.
      // This avoids having to re-render an identical element when mounting
      // one view onto another and they e.g. share the same header element.
      if (partial instanceof Partial) {
        // Determine if the placeholder is interchangeable with node
        // Node -> bool
        child.isSameNode = function isSameNode (node) {
          var ref = cache.get(node)
          return ref && ref instanceof Ref && ref.key === partial.key
        }

        // Expose interface for binding placeholder to an existing updater
        cache.set(child, new Ref(partial, function bind (node) {
          var ctx = cache.get(node)
          assert(ctx, 'nanohtml: cannot bind to uncached node')
          // Replace placeholder updater with existing nodes' updater
          var editor = editors.find((editor) => editor.index === index)
          editor.update = function update (value) {
            var values
            // Forward partial values
            if (value instanceof Partial) values = value.values
            // Wrap value in array
            else values = [value]
            return ctx.update(values)
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
      cache.set(res.element, new Ref(child.partial, res.bind))
      editors = editors.concat(res.editors)
      child = res.element
    } else {
      // Child is inline content, i.e. TextNode
      child = toNode(child)
      cache.set(child, new Ref(self.partial, function bind (node) {
        children[i] = node
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
      if (Array.isArray(newChild)) {
        var oldChildren = Array.isArray(child) ? child.slice() : [child]
        newChild = flatten(newChild).reduce(function mapChild (newChildren, value, index) {
          if (value instanceof Partial || value instanceof Component) {
            var ref
            // Look among siblings for a compatible element
            for (var i = 0, len = oldChildren.length; i < len; i++) {
              ref = cache.get(oldChildren[i])
              if (ref instanceof Ref && ref.key === value.key) {
                if (value instanceof Component) {
                  value = value.render(ref)
                }

                // Update matching element
                ref.update(value.values)

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

            if (value instanceof Component) {
              value = value.render()
            }

            // Create a new element if no match was found
            var match
            var res = parse(value)
            res.update(value.values)
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

          value = toNode(value)
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
        if (newChild instanceof Partial || newChild instanceof Component) {
          var ref = cache.get(child)
          if (ref instanceof Ref && ref.key === newChild.key && ref.update) {
            if (newChild instanceof Component) {
              newChild = newChild.render(ref)
            }
            return ref.update(newChild.values)
          } else {
            if (newChild instanceof Component) {
              newChild = newChild.render()
            }
            var res = parse(newChild)
            res.update(newChild.values)
            newChild = res.element
          }
        }

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
      if (self.namespace) {
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
