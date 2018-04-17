var convertSourceMap = require('convert-source-map')
var transformAst = require('transform-ast')
var through = require('through2')
var acorn = require('acorn')
var path = require('path')

var transform = require('./transform')

var SUPPORTED_VIEWS = ['nanohtml', 'bel', 'yo-yo', 'choo/html']

module.exports = function (file, opts) {
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
        res = apply(name, [ node.quasis.map(cooked) ].concat(node.expressions.map(expr)))
        node.parent.update(res)
      }
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && viewVariables.indexOf(node.callee.name) !== -1) {
      var template, expressions
      if (node.arguments[0] && node.arguments[0].type === 'ArrayExpression') {
        // Detect transpiled template strings like:
        //    html(["<div","/>"], {id: "test"})
        // Emitted by Buble.
        template = node.arguments[0].elements.map(function (part) { return part.value })
        expressions = node.arguments.slice(1).map(expr)
        res = apply(node.callee.name, [ template ].concat(expressions))
        node.update(res)
      } else if (node.arguments[0] && node.arguments[0].type === 'Identifier') {
        // Detect transpiled template strings like:
        //    html(_templateObject, {id: "test"})
        // Emitted by Babel.
        var templateObject = babelTemplateObjects[node.arguments[0].name]
        template = templateObject.elements.map(function (part) { return part.value })
        expressions = node.arguments.slice(1).map(expr)
        res = apply(node.callee.name, [ template ].concat(expressions))
        node.update(res)

        // Remove the _taggedTemplateLiteral helper call
        templateObject.parent.edit.update('0')
      }
    }
  }
}

var apply = transform.factory({
  arrayExpression: function (elements) {
    return '[' + elements.join(',') + ']'
  },
  objectExpression: function (properties) {
    return '{' + properties.join(',') + '}'
  },
  objectProperty: function (key, value, computed) {
    return computed
      ? ('[' + key + ']' + ':' + value)
      : (key + ':' + value)
  },
  stringLiteral: function (value) {
    return JSON.stringify(value)
  },
  callCreateElement (html, tag, props, children) {
    return html + '.createElement(' + tag + ',' + props + ',' + children + ')'
  },
  callObjectAssign (objects) {
    return 'Object.assign(' + objects.join(',') + ')'
  },
  stringConcat: function (a, b) {
    return a + '+' + b
  }
})

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
function expr (ex) { return transform.expr(ex.source()) }
