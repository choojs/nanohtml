var hyperx = require('hyperx')

var trailingNewlineRegex = /\n[\s]+$/
var leadingNewlineRegex = /^\n[\s]+/
var trailingSpaceRegex = /[\s]+$/
var leadingSpaceRegex = /^[\s]+/
var multiSpaceRegex = /[\n\s]+/g

var SVGNS = 'http://www.w3.org/2000/svg'
var XLINKNS = 'http://www.w3.org/1999/xlink'

var BOOL_PROPS = [
  'autofocus', 'checked', 'defaultchecked', 'disabled', 'formnovalidate',
  'indeterminate', 'readonly', 'required', 'selected', 'willvalidate'
]

var COMMENT_TAG = '!--'

var TEXT_TAGS = [
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'data', 'dfn', 'em', 'i',
  'kbd', 'mark', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'amp', 'small', 'span',
  'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr'
]

var CODE_TAGS = [
  'code', 'pre'
]

var SVG_TAGS = [
  'svg', 'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feFlood',
  'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage',
  'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight',
  'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence', 'filter',
  'font', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src',
  'font-face-uri', 'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image',
  'line', 'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph',
  'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
]

function belCreateElement (tag, props, children) {
  var el

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

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag)
  } else if (tag === COMMENT_TAG) {
    return document.createComment(props.comment)
  } else {
    el = document.createElement(tag)
  }

  var nodeName = el.nodeName.toLowerCase()

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
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS.indexOf(key) !== -1) {
        if (val === 'true') val = key
        else if (val === 'false') continue
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

  appendChild(children)
  return el

  function appendChild (childs) {
    if (!Array.isArray(childs)) return

    var hadText = false
    var value, leader

    for (var i = 0, len = childs.length; i < len; i++) {
      var node = childs[i]
      if (Array.isArray(node)) {
        appendChild(node)
        continue
      }

      if (typeof node === 'number' ||
        typeof node === 'boolean' ||
        typeof node === 'function' ||
        node instanceof Date ||
        node instanceof RegExp) {
        node = node.toString()
      }

      var lastChild = el.childNodes[el.childNodes.length - 1]

      // Iterate over text nodes
      if (typeof node === 'string') {
        hadText = true

        // If we already had text, append to the existing text
        if (lastChild && lastChild.nodeName === '#text') {
          lastChild.nodeValue += node

        // We didn't have a text node yet, create one
        } else {
          node = document.createTextNode(node)
          el.appendChild(node)
          lastChild = node
        }

        // If this is the last of the child nodes, make sure we close it out
        // right
        if (i === len - 1) {
          hadText = false
          // Trim the child text nodes if the current node isn't a
          // node where whitespace matters.
          if (TEXT_TAGS.indexOf(nodeName) === -1 &&
            CODE_TAGS.indexOf(nodeName) === -1) {
            value = lastChild.nodeValue
              .replace(leadingNewlineRegex, '')
              .replace(trailingSpaceRegex, '')
              .replace(trailingNewlineRegex, '')
              .replace(multiSpaceRegex, ' ')
            if (value === '') {
              el.removeChild(lastChild)
            } else {
              lastChild.nodeValue = value
            }
          } else if (CODE_TAGS.indexOf(nodeName) === -1) {
            // The very first node in the list should not have leading
            // whitespace. Sibling text nodes should have whitespace if there
            // was any.
            leader = i === 0 ? '' : ' '
            value = lastChild.nodeValue
              .replace(leadingNewlineRegex, leader)
              .replace(leadingSpaceRegex, ' ')
              .replace(trailingSpaceRegex, '')
              .replace(trailingNewlineRegex, '')
              .replace(multiSpaceRegex, ' ')
            lastChild.nodeValue = value
          }
        }

      // Iterate over DOM nodes
      } else if (node && node.nodeType) {
        // If the last node was a text node, make sure it is properly closed out
        if (hadText) {
          hadText = false

          // Trim the child text nodes if the current node isn't a
          // text node or a code node
          if (TEXT_TAGS.indexOf(nodeName) === -1 &&
            CODE_TAGS.indexOf(nodeName) === -1) {
            value = lastChild.nodeValue
              .replace(leadingNewlineRegex, '')
              .replace(trailingNewlineRegex, '')
              .replace(multiSpaceRegex, ' ')

            // Remove empty text nodes, append otherwise
            if (value === '') {
              el.removeChild(lastChild)
            } else {
              lastChild.nodeValue = value
            }
          // Trim the child nodes if the current node is not a node
          // where all whitespace must be preserved
          } else if (CODE_TAGS.indexOf(nodeName) === -1) {
            value = lastChild.nodeValue
              .replace(leadingSpaceRegex, ' ')
              .replace(leadingNewlineRegex, '')
              .replace(trailingNewlineRegex, '')
              .replace(multiSpaceRegex, ' ')
            lastChild.nodeValue = value
          }
        }

        // Store the last nodename
        var _nodeName = node.nodeName
        if (_nodeName) nodeName = _nodeName.toLowerCase()

        // Append the node to the DOM
        el.appendChild(node)
      }
    }
  }
}

module.exports = hyperx(belCreateElement, {comments: true})
module.exports.default = module.exports
module.exports.createElement = belCreateElement
