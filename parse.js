var assert = require('assert')
var hyperx = require('hyperx')
var cache = require('./cache')
var SVG_TAGS = require('./lib/svg-tags')
var BOOL_PROPS = require('./lib/bool-props')
var DIRECT_PROPS = require('./lib/direct-props')

var PLACEHOLDER = /\0placeholder(\d+)\0/g
var XLINKNS = 'http://www.w3.org/1999/xlink'
var SVGNS = 'http://www.w3.org/2000/svg'
var COMMENT_TAG = '!--'

module.exports = parse

function parse (template, ...values) {
  // Create indexed placeholders for all values
  var placeholders = values.map(function (v, index) {
    return '\0placeholder' + index + '\0'
  })

  // Parse template
  var parser = hyperx(renderTemplate, {
    comments: true,
    createFragment: createFragment
  })
  var parsed = parser(template, ...placeholders)

  return function render () {
    // Render element from template
    var res = parsed.render()

    // Cache element utilities
    cache.set(res.element, {
      key: template,
      update: update,
      bind: res.bind
    })

    // Sort updaters by index
    var updaters = res.editors.sort(function (a, b) {
      return a.index - b.index
    }).map(function (editor) {
      return function update () {
        return editor.update.apply(editor, arguments)
      }
    })

    return { element: res.element, update: update }

    // Run all updaters in order with given values
    // arr -> void
    function update (values) {
      assert(Array.isArray(values), 'values should be type array')
      assert.equal(values.length, updaters.length, 'nanohtml: number of values (' + values.length + ') must match number of slots (' + updaters.length + ')')
      for (var i = 0, len = values.length; i < len; i++) {
        updaters[i](values[i], values)
      }
    }
  }

  function renderTemplate (tag, props, children) {
    return { render, template }

    // Template generator
    // () -> Element
    function render () {
      var element
      var editors = []

      // If an svg tag, it needs a namespace
      if (SVG_TAGS.indexOf(tag) !== -1) {
        props.namespace = SVGNS
      }

      // If we are using a namespace
      var ns = false
      if (props.namespace) {
        ns = props.namespace
        delete props.namespace
      }

      // If we are extending a builtin element
      var isCustomElement = false
      if (props.is) {
        isCustomElement = props.is
        delete props.is
      }

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
          props[name].replace(PLACEHOLDER, function (placeholder) {
            editors.push({
              index: getPlaceholderIndex(placeholder),
              update (_, all) {
                var value = props[name].replace(PLACEHOLDER, function (_, index) {
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
      // we can store relevant references to the last rendered node (child).
      // We use the accumulator (children) to keep track of childrens' relative
      // indexes, which is usefull when nodes are removed and added back again.
      children.reduce(function (children, child, i) {
        var _update, _key

        if (isPlaceholder(child)) {
          // Child is a partial
          var index = getPlaceholderIndex(child)
          var partial = values[index]
          child = document.createComment('placeholder')

          // Handle partial component
          // TODO: Handle initial value being null
          if (typeof partial === 'object' && partial.key) {
            // Use key to determine if nodes are equal
            // Node -> bool
            child.isSameNode = function isSameNode (node) {
              var cached = cache.get(node)
              return cached && cached.key === partial.key
            }

            // Expose interface for binding placeholder to an existing updater
            cache.set(child, {
              key: partial.key,
              bind (node) {
                var cached = cache.get(node)
                assert(cached, 'nanohtml: cannot bind to uncached node')
                // Replace placeholder updater with existing nodes' updater
                var editor = editors.find((editor) => editor.index === index)
                editor.update = function update (value) {
                  var values
                  if (typeof value === 'object' && value.key === partial.key) {
                    // Forward partial values
                    values = partial.values
                  } else {
                    // Wrap value in array
                    values = [value]
                  }
                  return cached.update(values)
                }
              }
            })
          }

          editors.push({
            index: index,
            update: update
          })
        } else if (isChildTemplate(child, template)) {
          // Child is an inline child node of element
          var res = child.render()
          if (res && res.element && res.editors) {
            cache.set(res.element, {
              key: child.template,
              bind: res.bind
            })
            editors = editors.concat(res.editors)
            child = res.element
          }
        } else {
          // Child is inline content, i.e. TextNode
          child = toNode(child)
          cache.set(child, {
            key: child.template,
            bind (node) {
              children[i] = node
            }
          })
        }

        // Save reference to current child
        children[i] = child

        // Append child
        element.appendChild(child)

        // Return accumulator for next child to append to
        return children

        // Update/render node in-place
        // any -> void
        function update (newChild) {
          if (newChild && typeof newChild === 'object') {
            if (_update && newChild.key === _key) {
              return _update(newChild.values)
            } else if (typeof newChild.render === 'function') {
              var res = newChild.render()
              if (typeof res.update === 'function') {
                res.update(newChild.values)
                _key = newChild.key
                _update = res.update
                newChild = res.element
              }
            }
          }

          newChild = toNode(newChild)
          if (newChild == null) {
            removeChild(child)
          } else if (children[i] == null) {
            var next = i + 1
            while (next < children.length && children[next] == null) next++
            if (next === children.length) {
              element.appendChild(newChild)
            } else {
              element.insertBefore(newChild, children[next])
            }
          } else {
            replaceChild(child, newChild)
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
  }
}

// Determine wether given value is a placeholder value
// any -> bool
function isPlaceholder (value) {
  return typeof value === 'string' && /^\0placeholder/.test(value)
}

// Determine wether value is a child element of the given template
// (any, arr) -> bool
function isChildTemplate (value, template) {
  if (typeof value !== 'object') return false
  return typeof value.render === 'function' && value.template === template
}

// Get index of given placeholder value
// str -> num
function getPlaceholderIndex (placeholder) {
  return parseInt(placeholder.slice('\0placeholder'.length), 10)
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
