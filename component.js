var assert = require('assert')
var hyperx = require('hyperx')

module.exports = component

function component (render) {
  var template
  var stack = []

  return function Render () {
    var args = Array.prototype.slice.call(arguments)
    var parsed = render.apply(undefined, args)
    if (typeof window === 'undefined') return parsed

    stack.push(args)

    // reset stack on next frame if not all components were updated
    window.requestAnimationFrame(function () {
      var prev = stack
      stack = []
      assert(prev.length === 0, 'nanohtml: more components rendered than used')
    })

    return function createElement (context) {
      if (!template) {
        // parse template when first rendered
        template = parse.apply(null, [parsed.template].concat(
          parsed.values.map(function (v, index) {
            return '\0placeholder' + index + '\0'
          })
        ))
      }

      var res = template()
      var element = res.element
      var updaters = res.editors.sort(function (a, b) {
        return a.index - b.index
      }).map(function (editor) {
        return editor.update
      })

      element.isSameNode = function isSameNode (node) {
        return node === createElement
      }

      return update

      function update () {
        var values = stack.shift()
        assert.equal(values.length, updaters.length, 'number of values (' + values.length + ') must match number of slots (' + updaters.length + ')')
        for (var i = 0, len = values.length; i < len; i++) {
          updaters[i](values[i], values)
        }
        return element
      }
    }
  }
}

function isPlaceholder (value) {
  return typeof value === 'string' && /^\0placeholder/.test(value)
}

function getPlaceholderIndex (placeholder) {
  return parseInt(placeholder.slice('\0placeholder'.length))
}

function toNode (value) {
  var type = typeof value

  if (type === 'object' && value.nodeType) {
    return value
  }

  // if (type === 'function') {
  //   value = value()
  // }

  if (type === 'function' || type === 'string' || type === 'boolean' ||
      value instanceof RegExp || value instanceof Date) {
    value = value.toString()
  }

  if (typeof value === 'string') {
    return document.createTextNode(value)
  }

  if (Array.isArray(value)) {
    return toDocumentFragment(value)
  }
}
function toDocumentFragment (nodes) {
  var node = document.createDocumentFragment()
  for (var i = 0; i < nodes.length; i++) {
    node.appendChild(nodes[i])
  }
  return node
}

var parse = hyperx(function (tagName, props, children) {
  return function () {
    var el = document.createElement(tagName)
    var editors = []
    var names = Object.keys(props)
    names.forEach(function (name, i) {
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
            update: updater
          })
        })
        function updater (_, all) {
          var value = props[name].replace(/\0placeholder(\d+)\0/g, function (_, index) {
            return all[index]
          })
          setAttribute(name, value)
        }
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
            return function (newChild) {
              newChild = Array.isArray(newChild) ? newChild.map(toNode) : toNode(newChild)
              replaceChild(oldChild, newChild)
              oldChild = newChild
            }
          }(child))
        })
      } else if (child && child.element && child.editors) {
        editors = editors.concat(child.editors)
        child = child.element
      }
      el.appendChild(toNode(child))
    }

    return { element: el, editors: editors }

    function setAttribute (name, value) {
      if (/^on/.test(name)) {
        el[name] = value
      } else {
        el.setAttribute(name, value)
      }
    }

    function replaceChild (oldChild, newChild) {
      if (Array.isArray(oldChild)) {
        while (oldChild.length > 1) {
          el.removeChild(oldChild.pop())
        }
        oldChild = oldChild[0]
      }
      if (Array.isArray(newChild)) {
        newChild = toDocumentFragment(newChild)
      }
      el.replaceChild(newChild, oldChild)
    }
  }
})
