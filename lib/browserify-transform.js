var convertSourceMap = require('convert-source-map')
var transformAst = require('transform-ast')
var through = require('through2')
var hyperx = require('hyperx')
var acorn = require('acorn')
var path = require('path')

var SUPPORTED_VIEWS = ['nanohtml', 'bel', 'yo-yo', 'choo/html']
var DELIM = '~!@|@|@!~'

module.exports = function transform (file, opts) {
  if (/\.json$/.test(file)) return through()
  var bufs = []
  var viewVariables = []
  var babelTemplateObjects = Object.create(null)
  return through(write, end)

  function write (buf, enc, next) {
    bufs.push(buf)
    next()
  }

  function end (cb) {
    var src = Buffer.concat(bufs).toString('utf8')
    var res
    try {
      res = transformAst(src, { ecmaVersion: 8, parser: acorn }, walk)
      if (opts && opts._flags && opts._flags.debug) {
        res = res.toString() + '\n' + convertSourceMap.fromObject(res.map).toComment() + '\n'
      } else {
        res = res.toString()
      }
    } catch (err) {
      return cb(err)
    }
    this.push(res)
    this.push(null)
  }

  function walk (node) {
    var res

    if (isSupportedView(node)) {
      if (node.arguments[0].value === 'bel' ||
        node.arguments[0].value === 'choo/html' ||
        node.arguments[0].value === 'nanohtml') {
        // html and choo/html have no other exports that may be used
        node.edit.update('{ createElement: require("' + path.join(node.arguments[0].value, '/lib/createElement") }'))
      }
      if (node.parent.type === 'VariableDeclarator') {
        viewVariables.push(node.parent.id.name)
      }
    }

    if (node.type === 'VariableDeclarator' && node.init && BabelTemplateDefinition(node.init)) {
      // Babel generates helper calls like
      //    _taggedTemplateLiteral(["<div","/>"], ["<div","/>"])
      // The first parameter is the `cooked` template literal parts, and the second parameter is the `raw`
      // template literal parts.
      // We just pick the cooked parts.
      babelTemplateObjects[node.id.name] = node.init.arguments[0]
    }

    if (node.type === 'TemplateLiteral' && node.parent.tag) {
      var name = node.parent.tag.name || (node.parent.tag.object && node.parent.tag.object.name)
      if (viewVariables.indexOf(name) !== -1) {
        res = processNode(name, [ node.quasis.map(cooked) ].concat(node.expressions.map(exprSrc)))
        node.parent.update(unExpr(res))
      }
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && viewVariables.indexOf(node.callee.name) !== -1) {
      var template, expressions
      if (node.arguments[0] && node.arguments[0].type === 'ArrayExpression') {
        // Detect transpiled template strings like:
        //    html(["<div","/>"], {id: "test"})
        // Emitted by Buble.
        template = node.arguments[0].elements.map(function (part) { return part.value })
        expressions = node.arguments.slice(1).map(exprSrc)
        res = processNode(node.callee.name, [ template ].concat(expressions))
        node.update(unExpr(res))
      } else if (node.arguments[0] && node.arguments[0].type === 'Identifier') {
        // Detect transpiled template strings like:
        //    html(_templateObject, {id: "test"})
        // Emitted by Babel.
        var templateObject = babelTemplateObjects[node.arguments[0].name]
        template = templateObject.elements.map(function (part) { return part.value })
        expressions = node.arguments.slice(1).map(exprSrc)
        res = processNode(node.callee.name, [ template ].concat(expressions))
        node.update(unExpr(res))

        // Remove the _taggedTemplateLiteral helper call
        templateObject.parent.edit.update('0')
      }
    }
  }
}

function processNode (h, args) {
  var hx = hyperx(function (tag, props, children) {
    props = Object.keys(props).map(function (key) {
      if (isExpr(key)) {
        if (key === props[key]) {
          // spread props <div ${{ prop: val }}>
          return { spread: unExpr(key) }
        } else {
          // expr props <div ${prop}=${val}}>
          return { spread: '{[' + unExpr(key) + ']:' + unExpr(props[key]) + '}' }
        }
      } else {
        return { value: JSON.stringify(key) + ':' + unExpr(props[key]) }
      }
    })

    if (props.some(function (prop) { return prop.spread })) {
      props = props.map(function (prop) { return prop.value ? '{' + prop.value + '}' : prop.spread })
      props = 'Object.assign(' + props.join(',') + ')'
    } else {
      props = '{' + props.map(function (prop) { return prop.value }).join(',') + '}'
    }

    children = children && children.length ? ('[' + children.map(unExpr).join(',') + ']') : ''

    return expr(h + '.createElement(' + unExpr(tag) + ',' + props + ',' + children + ')')
  }, { concat: concat, comments: true })

  return hx.apply(null, args)
}

function concat (a, b) {
  var aexpr
  var bexpr
  var count = 0

  if (isExpr(a)) {
    aexpr = '(' + unExpr(a) + ')'
    count++
  } else {
    aexpr = a && JSON.stringify(a)
  }
  if (isExpr(b)) {
    bexpr = '(' + unExpr(b) + ')'
    count++
  } else {
    bexpr = b && JSON.stringify(b)
  }

  if (count === 0) return String(a) + String(b)
  if (!aexpr) return expr(bexpr)
  if (!bexpr) return expr(aexpr)
  return expr(aexpr + '+' + bexpr)
}

function isExpr (ex) {
  return ex && typeof ex === 'string' && ex.indexOf(DELIM) !== -1
}

function unExpr (ex) {
  if (!isExpr(ex)) {
    return JSON.stringify(ex)
  }
  return ex.split(DELIM)[1]
}

function isSupportedView (node) {
  return (node.type === 'CallExpression' &&
    node.callee && node.callee.name === 'require' &&
    node.arguments.length === 1 &&
    SUPPORTED_VIEWS.indexOf(node.arguments[0].value) !== -1)
}

function BabelTemplateDefinition (node) {
  return node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' && node.callee.name === '_taggedTemplateLiteral'
}

function cooked (node) { return node.value.cooked }
function expr (ex) { return DELIM + ex + DELIM }
function exprSrc (ex) { return expr(ex.source()) }
