'use strict'

const hyperx = require('hyperx')
const morph = require('./morph')
const SVG_TAGS = require('./svg-tags')
const TEXT_TAGS = require('./text-tags')
const BOOL_PROPS = require('./bool-props')
const DIRECT_PROPS = require('./direct-props')
const VERBATIM_TAGS = require('./verbatim-tags')

const cache = new WeakMap()
const pending = new WeakMap()
const templates = new WeakMap()

const onlyWhiteSpaceRegexp = /^[\n\s]+$/
const trailingNewlineRegex = /\n[\s]+$/
const leadingNewlineRegex = /^\n[\s]+/
const trailingSpaceRegex = /[\s]+$/
const leadingSpaceRegex = /^[\s]+/
const multiSpaceRegex = /[\n\s]+/g
const PLACEHOLDER_INDEX = /\0placeholder(\d+)\0/g
const XLINKNS = 'http://www.w3.org/1999/xlink'
const SVGNS = 'http://www.w3.org/2000/svg'
const FRAGMENT = Symbol('fragment')
const PENDING = Symbol('pending')
const REF = Symbol('ref')
const COMMENT_TAG = '!--'
const TEXT_NODE = 3

exports.Ref = Ref
exports.html = html
exports.cache = cache
exports.render = render
exports.Partial = Partial
exports.Context = Context

function html (template, ...values) {
  return new Partial({ template, values, key: template })
}

// Render partial, optionally mounting it on given node
// (Partial|Promise|Generator, Element) -> Element|Promise
function render (partial, oldNode) {
  partial = unwind(partial)

  // handle async top level partial and pending promises
  if (oldNode) pending.delete(oldNode)
  if (isPromise(partial)) {
    if (oldNode) pending.set(oldNode, partial)
    return partial.then(function (res) {
      if (!oldNode || pending.get(oldNode) === partial) {
        return render(res, oldNode)
      }
    })
  }

  // Update tree in place
  var ctx = oldNode && cache.get(oldNode)
  if (ctx && ctx.key === partial.key) {
    partial.update(ctx)
    return oldNode
  }

  // Render tree and mount in/replace old tree
  ctx = partial.render(oldNode)
  partial.update(ctx)
  if (oldNode && !ctx.element.isSameNode(oldNode)) {
    if (ctx.element instanceof window.DocumentFragment) {
      removeChild(Array.from(oldNode.childNodes))
      oldNode.appendChild(ctx.element)
    } else {
      oldNode.replaceWith(ctx.element)
    }
  }
  return ctx.element
}

// Create a reference to an element, should be assigned as id attribute
// (String?) -> Ref
function Ref (uid = makeId()) {
  if (!(this instanceof Ref)) return new Ref(uid)
  if (typeof window === 'undefined') return uid
  return new Proxy(this, {
    get: (self, key, receiver) => {
      var element = document.getElementById(uid)
      switch (key) {
        // Expose inernal uid to determine equality
        case REF: return uid
        // Expose underlying element to circumvent proxy
        case 'element': return element
        // Support all forms of serialization
        case Symbol.toPrimitive:
        case 'toString':
        case 'toJSON': return () => uid
        // Proxy everything else to the element
        default: return Reflect.get(element || this, key)
      }
    },
    set (obj, key, value) {
      // Allow overriding the uid to persist id attribute between updates
      if (key === REF) return (uid = value[REF])
      var element = document.getElementById(uid)
      if (element) return Reflect.set(element, key, value)
    }
  })
}
if (typeof window !== 'undefined') {
  // Augument the Element class to make the proxy as transparent as possible
  Ref.prototype = Object.create(window.Element.prototype)
  Ref.prototype.constructor = Ref
}

// Element partial holding values and template
// ({ template: Array, values: Array, key: any }) -> Partial
function Partial ({ template, values, key }) {
  this.template = template
  this.values = values
  this.key = key
}

// Render a partial, optionally morphing it onto an existing node
// (Element?) -> Context
Partial.prototype.render = function render (oldNode) {
  var { values, key } = this
  var template = templates.get(this.template)

  if (!template) {
    const placeholders = values.map(function toPlaceholder (_, index) {
      return '\0placeholder' + index + '\0'
    })

    const parser = hyperx(createTemplate, {
      comments: true,
      createFragment (nodes) {
        return createTemplate(FRAGMENT, {}, nodes)
      }
    })

    template = parser.apply(undefined, [this.template].concat(placeholders))

    if (typeof template === 'string') {
      if (isPlaceholder(template)) {
        // The only child is a partial, e.g. html`${html`<p>Hi</p>`}` or html`${'Hi'}`
        template = createTemplate(FRAGMENT, {}, placeholders)
      } else {
        // The only child is text, e.g. html`Hi`
        template = createTemplate(FRAGMENT, {}, [template])
      }
    }

    templates.set(this.template, template)
  }

  return template(values, key, oldNode)
}

// Update element with partial values
// (Context) -> void
Partial.prototype.update = function update (ctx) {
  ctx.state.get(PENDING).clear()
  for (const { update, index } of ctx.editors) {
    update(this.values[index], this.values)
  }
}

// Bindings for identifying and updating a rendered element
// ({ key: any, element: Node, editors: Array, bind: Function }) -> Context
function Context ({ key, element, editors, bind }) {
  this.key = key
  this.bind = bind
  this.element = element
  this.state = new Map([[PENDING, new Set()]])
  this.isPlaceholder = isPlaceholder(element.nodeValue)
  this.editors = editors.slice().sort((a, b) => a.index - b.index)
}

// Create a template for an element
// (String, Object, Array) -> Function
function createTemplate (tag, attrs, children = []) {
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

  return template

  // Render element with placeholders, optionally mounting onto an existing node
  // (Array, any, Node) -> Context
  function template (values, key, oldNode) {
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
      if (tag === COMMENT_TAG) return
      // Object as attribute (i.e. <input ${{ type: 'text' }}>) results in the
      // attribute being formatted as such { placeholder0: 'placeholder0' }
      if (isPlaceholder(name) && isPlaceholder(value)) {
        var index = getPlaceholderIndex(name)
        if (index === getPlaceholderIndex(value)) {
          editors.push({
            index: index,
            update (attrs) {
              Object.entries(attrs).forEach(function ([name, value]) {
                setAttribute(name, value)
              })
            }
          })
        }
      } else if (isPlaceholder(name)) {
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
            if (name === 'id' && value instanceof Ref) {
              var ctx = cache.get(element)
              var ref = ctx.state.get(REF)
              if (!ref) {
                ctx.state.set(REF, value)
              } else {
                value[REF] = ref
                value = ref
              }
            }
            setAttribute(name, value)
          }
        })
      } else if (PLACEHOLDER_INDEX.test(name)) {
        // Handle mixed attribute name <div data-${'thing'}="hey">
        name.replace(PLACEHOLDER_INDEX, function placeholderAttr (match) {
          editors.push({
            index: getPlaceholderIndex(match),
            update (_, all) {
              var next = name.replace(
                PLACEHOLDER_INDEX,
                function updateAttr (_, index) {
                  return all[index]
                }
              )
              setAttribute(next, value)
            }
          })
        })
      } else if (PLACEHOLDER_INDEX.test(value)) {
        // Handle mixed attribute value <div class="${'hey'} there">
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

    // Handle children, adding placeholders for all partials
    var oldChildren = oldNode && Array.from(oldNode.childNodes)
    var newChildren = children.reduce(function eachChild (children, child, index, all) {
      // Resolve inline templates
      if (typeof child === 'function') child = child(values, key)

      if (isPlaceholder(child)) {
        const placeholderIndex = getPlaceholderIndex(child)
        child = values[placeholderIndex]

        if (child instanceof Partial) {
          // If we know up front that there's to be a partial here, use it to
          // determine if we can just reuse an existing child in `oldNode`
          children[index] = appendChild(child, placeholderIndex)
        } else {
          // Append a placeholder and create an editor for updating it
          child = document.createComment('placeholder')
          children[index] = appendChild(child, placeholderIndex)
          editors.push({
            index: placeholderIndex,
            update: createUpdate(child)
          })
        }
      } else if (child instanceof Context) {
        // Capture inline template child editors
        children[index] = appendChild(child.element)
        editors.push(...child.editors)
      } else {
        // Create a faux context for generic content (text nodes) so that they
        // can be bound to an exiting text node in `oldChild`
        children[index] = child = appendChild(child)
        if (child != null) {
          cache.set(child, new Context({
            key: Symbol(index),
            element: child,
            editors: [],
            bind (newNode) {
              children[index] = newNode
            }
          }))
        }
      }

      return children

      // Create an updater for given element
      // (Node) -> Function
      function createUpdate (oldChild) {
        return function update (newChild) {
          newChild = unwind(newChild)

          if (Array.isArray(newChild)) {
            newChild = newChild.flat(Infinity)
            oldChild = Array.isArray(oldChild) ? oldChild : [oldChild]

            // Handle array of children, match with an old element or render new
            const newChildren = newChild.map(function childNode (child, index) {
              child = unwind(child)

              if (isPromise(child)) {
                // Defer update till after promise resolves
                queue(child).then(function (child) {
                  child = childNode(child)
                  appendInPlace(child, index, newChildren)
                  newChildren[index] = child
                })
                return null
              }

              if (child instanceof Partial) {
                // Try and match to existing element and update in place
                for (let i = 0, len = oldChild.length; i < len; i++) {
                  const ctx = cache.get(oldChild[i])
                  if (ctx && ctx.key === child.key) {
                    child.update(ctx)
                    return oldChild.splice(i, 1)[0]
                  }
                }
                // Render a new element
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
            return
          }

          if (isPromise(newChild)) {
            // Defer update till after promise resolves
            queue(newChild).then((newChild) => update(newChild))
            newChild = null
          } else if (newChild instanceof Partial) {
            // Try and match to existing element and update in place
            let ctx = oldChild && cache.get(oldChild)
            if (ctx && newChild.key === ctx.key && !ctx.isPlaceholder) {
              newChild.update(ctx)
              newChild = oldChild
            } else {
              // Render a new element
              ctx = newChild.render(oldChild)
              newChild.update(ctx)
              newChild = ctx.element
            }
          } else {
            newChild = toNode(newChild)
          }

          // Insert element in place, replacing an old node if there is one
          if (oldChild && oldChild.parentNode === element) {
            replaceChild(newChild, oldChild)
          } else {
            appendInPlace(newChild)
          }

          children[index] = oldChild = newChild
        }

        // Insert a node in its proper place
        // (Node, Number?, Array?) -> void
        function appendInPlace (node, _index, _children) {
          if (!node) return
          var prev
          if (typeof _index !== 'undefined') {
            prev = getPrevSibling(_children, _index - 1)
          }
          if (!prev) prev = getPrevSibling(children, index - 1)
          var next = prev && prev.nextSibling
          if (next && next.isSameNode && next.isSameNode(node)) return
          if (next) next.before(node)
          else element.appendChild(node)
        }

        // Find previous sibling in list of nodes
        // (Array, Number?) -> Node?
        function getPrevSibling (nodes, start = nodes.length - 1) {
          for (let i = start; i >= 0; i--) {
            let node = nodes[i]
            if (Array.isArray(node)) node = getPrevSibling(node)
            if (node != null && node.parentNode === element) return node
          }
        }
      }

      // Append child to element
      // (Node, Number?) -> Node?
      function appendChild (child, placeholderIndex) {
        var node

        // Normalize whitespace
        if (typeof child === 'string') {
          if (!VERBATIM_TAGS.includes(tag)) {
            if (!TEXT_TAGS.includes(tag)) {
              if (onlyWhiteSpaceRegexp.test(child)) {
                const prev = children[index - 1]
                if (!prev || !TEXT_TAGS.includes(prev.nodeName.toLowerCase())) {
                  return null
                }
              }
            }

            const leader = index === 0 ? '' : ' '
            const tail = index === all.length - 1 ? '' : ' '
            child = child
              .replace(leadingNewlineRegex, leader)
              .replace(leadingSpaceRegex, ' ')
              .replace(trailingSpaceRegex, tail)
              .replace(trailingNewlineRegex, '')
              .replace(multiSpaceRegex, ' ')

            if (child === '') {
              return null
            }
          }
        }

        // Try and find a compatible node in the oldNode tree
        if (oldNode && element === oldNode) {
          for (let i = 0; i < oldChildren.length; i++) {
            let oldChild = oldChildren[i]
            if (child instanceof Partial) {
              node = node || document.createComment('placeholder')
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
              // Only morph compatible nodes that are not cached
              if (!isEqual(node, oldChild) || cache.has(oldChild)) continue
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
          // Create a placeholder comment node
          const value = '\0placeholder' + placeholderIndex + '\0'
          node = document.createComment(value)

          // Have placeholder identify as compatible with any element created
          // from the same template
          node.isEqualNode = function isEqualNode (node) {
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
              // Replace update with updater scoped to the new node
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

      // Replace an existing node with a new node
      // (Node?, Node?) -> void
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
                oldChild.replaceWith(newChild)
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

    // TODO: optimize, see createUpdate (appendInPlace)
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

    if (attrs.id && isPlaceholder(attrs.id)) {
      // Save reference with element to preserve id in-between renders
      ctx.state.set(REF, values[getPlaceholderIndex(attrs.id)])
    }

    // Cache context with element
    cache.set(element, ctx)

    return ctx

    // Update internal element reference
    // (Element) -> void
    function bind (newElement) {
      element = newElement
    }

    // Insert node(s) before given node
    // (Node|Array, Node) -> void
    function insertBefore (newChild, oldChild) {
      oldChild = Array.isArray(oldChild) ? oldChild[0] : oldChild
      if (Array.isArray(newChild)) {
        for (const child of newChild) {
          oldChild.before(child)
        }
      } else {
        oldChild.before(newChild)
      }
    }

    // Set attribute to element
    // (String, String|Promise) -> void
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
      if (BOOL_PROPS.includes(key)) {
        if (String(value) === 'true') value = key
        else if (String(value) === 'false' || value == null) return
      }

      // If a property prefers being set directly vs setAttribute
      if (key.indexOf('on') === 0 || DIRECT_PROPS.includes(key)) {
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

    // Only resolve promise if it has not been cleared from element state
    // (Promise) -> Promise
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

// Resolve nested generator and promises
// (any, any?) -> any
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

// Determin if object is promise
// (any) -> Boolean
function isPromise (obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'
}

// Determine if object is generator
// (any) -> Boolean
function isGenerator (obj) {
  return obj && typeof obj.next === 'function' && typeof obj.throw === 'function'
}

// Remove child
// (Node|Array) -> void
function removeChild (child) {
  if (!child) return
  if (Array.isArray(child)) {
    for (const el of child) el.remove()
  } else {
    child.remove()
  }
}

// Morph children from one node onto another
// (Node, Node) -> void
function updateChildren (newNode, oldNode) {
  var newChildren = Array.from(newNode.childNodes)
  var oldChildren = Array.from(oldNode.childNodes)

  var prev
  for (const newChild of newChildren) {
    if (!newChild) continue

    let match
    for (let i = 0, len = oldChildren.length; i < len; i++) {
      if (isEqual(newChild, oldChildren[i])) {
        match = oldChildren[i]
        oldChildren.splice(i, 1)
        break
      }
    }

    if (match) {
      // Bind matching node to the new node
      const ctx = cache.get(newChild)
      if (ctx) ctx.bind(match)

      if (match.nodeType === TEXT_NODE) {
        match.nodeValue = newChild.nodeValue
      } else if (!ctx.isPlaceholder) {
        morph(newChild, match)
        updateChildren(newChild, match)
      }

      if (prev) {
        prev.after(match)
      } else {
        oldNode.appendChild(match)
      }
      prev = match
    } else {
      if (prev) {
        prev.after(newChild)
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

// Create appropiate node
// (String, Object, { namespace: String, isCustomElement: Boolean }) -> Node
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

// Create document fragment and append children
// (Array) -> DocumentFragment
function createFragment (nodes) {
  var fragment = document.createDocumentFragment()
  for (const node of nodes) {
    if (node == null) continue
    fragment.appendChild(toNode(node))
  }
  return fragment
}

// Cast value to node
// (any) -> any
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

// Detemine if two nodes are equal and can be morphed
// (Node, Node) -> Boolean
function isEqual (a, b) {
  if (a.id) return a.id === b.id
  if (a.isEqualNode && a.isEqualNode(b)) return true
  if (a.tagName && b.tagName && a.tagName === b.tagName) return true
  if (a.nodeType === TEXT_NODE && b.nodeType === TEXT_NODE) return true
  return false
}

// Determine if value is a placeholder
// (any) -> Boolean
function isPlaceholder (value) {
  return typeof value === 'string' && /^\0placeholder/.test(value)
}

// Extract index from placeholder identifier
// (String) -> Number
function getPlaceholderIndex (placeholder) {
  return parseInt(placeholder.slice('\0placeholder'.length), 10)
}

// Generate a unique id
// () -> String
function makeId () {
  return `__ref-${Math.random().toString(36).substr(-4)}`
}
