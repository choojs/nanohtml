import assert from 'nanoassert/index.js'
import hyperx from 'hyperx/index.js'
import Ref from './ref.js'
import Node from './node.js'
import cache from './cache.js'
import SVG_TAGS from './lib/svg-tags'
import BOOL_PROPS from './lib/bool-props'
import DIRECT_PROPS from './lib/direct-props'

const PLACEHOLDER_INDEX = /\0placeholder(\d+)\0/g
const XLINKNS = 'http://www.w3.org/1999/xlink'
const SVGNS = 'http://www.w3.org/2000/svg'
const COMMENT_TAG = '!--'

const templates = new WeakMap()

export default class Partial {
  constructor (tmpl, values) {
    this.key = tmpl
    this.template = tmpl
    this.values = values
  }

  render (node) {
    if (node) {
      node.update(this.values)
      return node
    }

    var template = templates.get(this.template)
    if (!template) {
      // Create indexed placeholders for all values
      var placeholders = this.values.map(function (v, index) {
        return '\0placeholder' + index + '\0'
      })

      var parser = hyperx((tag, props, children) => {
        return new Template(this, tag, props, children)
      }, {
        comments: true,
        createFragment: createFragment
      })

      template = parser.apply(undefined, [this.template].concat(placeholders))
      templates.set(this.template, template)
    }

    // Render element from template
    node = template.render()

    // Tag node with key
    node.key = this.key

    // Cache self with element
    cache.set(node.element, node)

    return node
  }
}

class Template {
  constructor (partial, tag, props, children) {
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

  render (context) {
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
    this.children.reduce(function mapChildren (children, child, index) {
      if (isPlaceholder(child)) {
        // Child is a partial
        const index = getPlaceholderIndex(child)
        const value = self.partial.values[index]
        child = document.createComment('placeholder')

        // Handle partial
        // If we know upfront that there's going to be a partial in this slot
        // we can expose means to bind the placeholder to an existing updater.
        // This avoids having to re-render an identical element when mounting
        // one view onto another and they e.g. share the same header partial.
        if (value instanceof Partial) {
          // Determine if the placeholder is interchangeable with existing node
          // Node -> bool
          child.isSameNode = function isSameNode (node) {
            var cached = cache.get(node)
            return cached instanceof Partial && cached.key === value.key
          }

          // Expose interface for binding placeholder to an existing updater
          cache.set(child, new Ref(value.key, function bind (node) {
            // Override partial bind method with a proxy for the existing node
            var cached = cache.get(node)
            assert(cached, 'nanohtml: cannot bind to uncached node')
            // Replace placeholder updater with existing nodes' updater
            var editor = editors.find((editor) => editor.index === index)
            editor.update = function update (value) {
              if (value instanceof Partial) value.render(cached)
              else cached.update([value])
            }
          }))
        }

        editors.push({ index, update })
      } else if (child instanceof Template) {
        // Child is a child node of element
        const res = child.render()
        cache.set(res.element, new Ref(child.partial.key, res.bind))
        editors = editors.concat(res.editors)
        child = res.element
      } else {
        // Child is inline content, i.e. TextNode
        child = toNode(child)
        cache.set(child, new Ref(self.partial.key, function bind (node) {
          children[index] = node
        }))
      }

      // Append child
      element.appendChild(child)

      // Update and forward accumulator to the next child
      children[index] = child
      return children

      // Update/render node in-place
      // any -> void
      function update (newChild) {
        if (Array.isArray(newChild)) {
          const oldChildren = Array.isArray(child) ? child.slice() : [child]

          // This is again a reduce which offers us a scope in which to manage
          // the order of element children.
          newChild = newChild.flat().reduce(function mapChild (newChildren, value, _index) {
            if (value instanceof Partial) {
              // Look among siblings for a compatible element
              for (let i = 0, len = oldChildren.length; i < len; i++) {
                const cached = cache.get(oldChildren[i])
                if (cached instanceof Partial && cached.key === value.key) {
                  // Update existing element
                  value.render(cached)

                  // Save updated element in current index
                  newChildren.push(oldChildren[i])

                  // We'll have to move the element if the index has changed
                  if (i !== _index) {
                    let next

                    // Figure out which element should be next sibling
                    if (oldChildren.length - 1 >= _index) {
                      next = oldChildren[_index]
                    } else {
                      next = newChildren[newChildren.length - 1]
                      next = next && next.nextSibling
                    }

                    // Move element into place
                    if (next) {
                      element.insertBefore(oldChildren[i], next)
                    } else {
                      element.appendChild(oldChildren[i])
                    }
                  }

                  // Drop reference so that it's not updated more than once
                  len--
                  oldChildren.splice(i, 1)

                  // continue with next child
                  return newChildren
                }
              }

              // Create a new element if no match was found
              let match
              let res = value.render()
              res.update(res.values)
              if (newChildren.length) {
                // Find next sibling adjacent to previously inserted node
                match = newChildren[newChildren.length - 1]
                match = match && match.nextSibling
              } else if (children.length > index) {
                // Find adjacent child from last update
                match = children.slice(index + 1).find(Boolean)
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
            if (children.length >= _index) {
              replaceChild(children[_index], value)
            } else {
              element.appendChild(value)
            }
            newChildren.push(value)
            return newChildren
          }, [])

          // Remove excess legacy children
          removeChild(oldChildren)
        } else {
          if (newChild instanceof Partial) {
            const cached = cache.get(child)
            if (cached instanceof Partial && cached.key === newChild.key) {
              return newChild.render(cached)
            } else {
              const res = newChild.render()
              res.update(newChild.values)
              newChild = res.element
            }
          }

          newChild = toNode(newChild)
          if (newChild == null && child) {
            removeChild(child)
          } else if (newChild && child == null) {
            // Find next sibling before which to insert node
            let next = index + 1
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
        children[index] = child = newChild
      }
    }, [])

    return new Node(element, editors, bind)

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
