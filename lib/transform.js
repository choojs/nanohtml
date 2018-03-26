var hyperx = require('hyperx')

var EXPR_DELIM = '~!@|@|@!~'
var CEXPR_DELIM = '~!#|#|#!~'

module.exports.expr = expr
module.exports.factory = factory

function expr (ex) { return EXPR_DELIM + ex + EXPR_DELIM }
function unexpr (ex) { return ex.split(EXPR_DELIM)[1] }
function isexpr (ex) { return typeof ex === 'string' && ex.indexOf(EXPR_DELIM) !== -1 }

function cexpr (cex) { return CEXPR_DELIM + cex + CEXPR_DELIM }
function uncexpr (cex) { return cex.split(CEXPR_DELIM)[1] }
function iscexpr (cex) { return typeof cex === 'string' && cex.indexOf(CEXPR_DELIM) !== -1 }

function wrap (value) { return { __wrapper__: value } }
function unwrap (wrapper) { return wrapper ? wrapper.__wrapper__ : undefined }
function iswrapper (wrapper) { return typeof wrapper === 'object' && wrapper.__wrapper__ !== undefined }

function concat (a, b) {
  var aexpr
  var bexpr

  if (iscexpr(a)) aexpr = a // c-expression
  else if (isexpr(a)) aexpr = cexpr(JSON.stringify(a)) // expression
  else aexpr = a && cexpr(JSON.stringify(a)) // literal

  if (iscexpr(b)) aexpr = b
  else if (isexpr(b)) bexpr = cexpr(JSON.stringify(b))
  else bexpr = b && cexpr(JSON.stringify(b))

  if (!aexpr) return bexpr
  if (!bexpr) return aexpr

  return cexpr('["+",' + uncexpr(aexpr) + ',' + uncexpr(bexpr) + ']')
}

function factory (impl) {
  return function (html, args, getexpr) {
    var result = apply(html, args, getexpr)
    if (result) return unwrap(result)
  }

  function apply (html, args, _getexpr) {
    function getexpr (ex) { return _getexpr ? _getexpr(unexpr(ex)) : unexpr(ex) }

    function parse (cex) {
      if (iscexpr(cex)) return parse(JSON.parse(uncexpr(cex)))
      if (isexpr(cex)) return getexpr(cex)
      if (!Array.isArray(cex)) return impl.stringLiteral(cex)

      var op = cex[0]
      var left = cex[1]
      var right = cex[2]

      if (op === '+') {
        return impl.stringConcat(parse(left), parse(right))
      }
    }

    function resolve (val) {
      if (iscexpr(val)) return parse(val)
      if (iswrapper(val)) return unwrap(val)
      if (isexpr(val)) return getexpr(val)
      return impl.stringLiteral(val)
    }

    function h (tag, props, children) {
      tag = isexpr(tag) ? getexpr(tag) : impl.stringLiteral(tag)

      props = Object.keys(props).map(function (key) {
        if (isexpr(key)) {
          if (key === props[key]) {
            // spread props <div ${{ prop: val }}>
            return { object: resolve(props[key]) }
          } else {
            // expr props <div ${prop}=${val}}>
            return { object: impl.objectExpression([impl.objectProperty(resolve(key), resolve(props[key]), true)]) }
          }
        } else {
          return { property: impl.objectProperty(resolve(key), resolve(props[key])) }
        }
      })

      if (props.some(function (prop) { return prop.object })) {
        props = props.map(function (prop) { return prop.property ? impl.objectExpression([prop.property]) : prop.object })
        props = impl.callObjectAssign(props)
      } else {
        props = props.map(function (prop) { return prop.property })
        props = impl.objectExpression(props)
      }

      children = children || []
      children = children.map(resolve)
      children = impl.arrayExpression(children)

      return wrap(impl.callCreateElement(html, tag, props, children))
    }

    var hx = hyperx(h, { concat: concat, comments: true })
    return hx.apply(null, args)
  }
}
