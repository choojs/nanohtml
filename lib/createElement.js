var appendChild = require('./append-child')
var SVG_TAGS = require('./svg-tags')
var BOOL_PROPS = require('./bool-props')

var SVGNS = 'http://www.w3.org/2000/svg'
var XLINKNS = 'http://www.w3.org/1999/xlink'

var COMMENT_TAG = '!--'

function nanoHtmlCreateElement (tag, props, children) {
  var el
  var opts

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

  // If `is` prop set then register custom element
  if (props.is) {
    if (typeof props.is === 'function') {
      if (!window.customElements.get(props.is.tagName)) {
        window.customElements.define(props.is.tagName, props.is, props.is.options)
      }
      opts = { is: props.is.tagName }
    } else {
      opts = { is: props.is }
    }
  }

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag, opts)
  } else if (tag === COMMENT_TAG) {
    return document.createComment(props.comment)
  } else if (typeof tag === 'function') {
    if (!window.customElements.get(tag.tagName)) {
      window.customElements.define(tag.tagName, tag, tag.options)
    }
    el = document.createElement(tag.tagName, opts)
  } else {
    el = document.createElement(tag, opts)
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase()
      var val = props[p]
      // Normalize className
      if (key === 'classname') {
        key = 'class'
        p = 'class'
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for'
      }
      // If `is` attribute was set on createElement then skip
      if (key === 'is' && opts && opts.is) {
        continue
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS.indexOf(key) !== -1) {
        if (val === 'false' || val === false) continue
        else if (val === 'true' || val === true) val = key
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val
      } else {
        if (ns) {
          if (p === 'xlink:href') {
            el.setAttributeNS(XLINKNS, p, val)
          } else if (/^xmlns($|:)/i.test(p)) {
            // skip xmlns definitions
          } else {
            el.setAttributeNS(null, p, val)
          }
        } else {
          el.setAttribute(p, val)
        }
      }
    }
  }

  appendChild(el, children)
  return el
}

module.exports = nanoHtmlCreateElement
