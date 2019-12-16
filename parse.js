var assert = require('assert')
var hyperx = require('hyperx')
var SVG_TAGS = require('./lib/svg-tags')
var BOOL_PROPS = require('./lib/bool-props')
var DIRECT_PROPS = require('./lib/direct-props')

var SVGNS = 'http://www.w3.org/2000/svg'
var XLINKNS = 'http://www.w3.org/1999/xlink'
var COMMENT_TAG = '!--'

module.exports = parse

function parse (template, ...values) {
  // Create indexed placeholders for all values
  values = values.map(function (v, index) {
    return '\0placeholder' + index + '\0'
  })

  // Parse template
  var parser = hyperx(nanoHtmlCreateElement, {
    comments: true,
    createFragment: createFragment
  })
  var createElement = parser(template, ...values)

  return function parsed () {
    // Create element from template
    var res = createElement()

    // Sort updaters by index
    var updaters = res.editors.sort(function (a, b) {
      return a.index - b.index
    }).map(function (editor) {
      return editor.update
    })

    return { element: res.element, update }

    // Run all updaters in order with given values
    // arr -> void
    function update (values) {
      assert(Array.isArray(values), 'values should be type array')
      assert.equal(values.length, updaters.length, 'number of values (' + values.length + ') must match number of slots (' + updaters.length + ')')
      for (var i = 0, len = values.length; i < len; i++) {
        updaters[i](values[i], values)
      }
    }
  }

  function nanoHtmlCreateElement (tag, props, children) {
    createElement.template = template
    return createElement

    // Template generator
    // () -> Element
    function createElement () {
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
          props[name].replace(/\0placeholder(\d+)\0/g, function (placeholder) {
            editors.push({
              index: getPlaceholderIndex(placeholder),
              update (_, all) {
                var value = props[name].replace(/\0placeholder(\d+)\0/g, function (_, index) {
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

      for (var i = 0, len = children.length; i < len; i++) {
        var child = children[i]
        if (isPlaceholder(child)) {
          var index = getPlaceholderIndex(child)
          child = document.createComment('placeholder')
          editors.push({
            index: index,
            update: (function (oldChild) {
              var update
              return function (newChild) {
                if (newChild.template && newChild.values) {
                  if (update) {
                    update(newChild.values)
                    newChild = oldChild
                    return
                  } else if (newChild.createElement) {
                    var res = newChild.createElement()
                    newChild = res.element
                    update = res.update
                  }
                }
                newChild = Array.isArray(newChild) ? newChild.map(toNode) : toNode(newChild)
                replaceChild(oldChild, newChild)
                oldChild = newChild
              }
            }(child))
          })
        } else if (typeof child === 'function' && child.template === template) {
          var res = child()
          if (res && res.element && res.editors) {
            editors = editors.concat(res.editors)
            child = res.element
          }
        }
        element.appendChild(toNode(child))
      }

      return { element, editors }

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

      function replaceChild (oldChild, newChild) {
        if (Array.isArray(oldChild)) {
          while (oldChild.length > 1) {
            element.removeChild(oldChild.pop())
          }
          oldChild = oldChild[0]
        }
        if (Array.isArray(newChild)) {
          newChild = createFragment(newChild)
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

// Get index of given placeholder value
// str -> num
function getPlaceholderIndex (placeholder) {
  return parseInt(placeholder.slice('\0placeholder'.length), 10)
}

// Cast given value to Node
// any -> Node
function toNode (value) {
  var type = typeof value

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
