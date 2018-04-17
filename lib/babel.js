'use strict'

const transform = require('./transform')

module.exports = (babel) => {
  const t = babel.types
  const nanohtmlModuleNames = ['nanohtml', 'bel', 'yo-yo', 'choo/html']

  function isNanohtmlRequireCall (node) {
    if (!t.isIdentifier(node.callee, { name: 'require' })) {
      return false
    }
    const firstArg = node.arguments[0]
    // Not a `require('module')` call
    if (!firstArg || !t.isStringLiteral(firstArg)) {
      return false
    }

    const importFrom = firstArg.value
    return nanohtmlModuleNames.indexOf(importFrom) !== -1
  }

  var apply = transform.factory({
    arrayExpression: t.arrayExpression,
    objectExpression: t.objectExpression,
    objectProperty: t.objectProperty,
    stringLiteral: t.stringLiteral,
    callCreateElement (html, tag, props, children) {
      return t.callExpression(
        t.memberExpression(html, t.identifier('createElement')),
        [tag, props, children]
      )
    },
    callObjectAssign (objects) {
      return t.callExpression(
        t.memberExpression(t.identifier('Object'), t.identifier('assign')),
        objects
      )
    },
    stringConcat: function (a, b) {
      return t.binaryExpression('+', a, b)
    }
  })

  return {
    pre () {
      this.nanohtmlBindings = new Set()
    },
    post () {
      this.nanohtmlBindings.clear()
    },
    visitor: {
      Program: {
        exit (path, state) {
          // Check every binding if it can be replaced with `createElement` implementation only
          for (const binding of this.nanohtmlBindings) {
            const replace = binding.referencePaths.every(function (reference) {
              const node = reference.parentPath.node
              if (!node) return true // node got removed
              return t.isCallExpression(node) && node.callee.property.name === 'createElement'
            })

            if (replace) {
              var library
              var identifier = binding.identifier

              if (binding.path.parentPath.isImportDeclaration()) {
                library = binding.path.parentPath.node.source.value
                binding.path.parentPath.remove()
              } else {
                library = binding.path.node.init.arguments[0].value
                binding.path.remove()
              }

              if (this.opts.useImport) {
                var createElement = path.scope.generateUidIdentifier('createElement')
                path.scope.push({
                  id: identifier,
                  init: t.objectExpression([
                    t.objectProperty(
                      t.stringLiteral('createElement'),
                      createElement
                    )
                  ])
                })
                path.unshiftContainer('body', t.importDeclaration([
                  t.importDefaultSpecifier(createElement)
                ], t.stringLiteral(library + '/lib/createElement')))
              } else {
                path.scope.push({
                  id: identifier,
                  init: t.objectExpression([
                    t.objectProperty(
                      t.stringLiteral('createElement'),
                      t.callExpression(t.identifier('require'), [t.stringLiteral(library + '/lib/createElement')])
                    )
                  ])
                })
              }
            }
          }
        }
      },

      /**
       * Collect nanohtml variable names and remove their imports if necessary.
       */
      ImportDeclaration (path, state) {
        const importFrom = path.get('source').node.value
        if (nanohtmlModuleNames.indexOf(importFrom) !== -1) {
          const specifier = path.get('specifiers')[0]
          if (specifier.isImportDefaultSpecifier()) {
            this.nanohtmlBindings.add(path.scope.getBinding(specifier.node.local.name))
          }
        }
      },

      CallExpression (path, state) {
        if (isNanohtmlRequireCall(path.node)) {
          // Not a `thing = require(...)` declaration
          if (!path.parentPath.isVariableDeclarator()) return
          this.nanohtmlBindings.add(path.parentPath.scope.getBinding(path.parentPath.node.id.name))
        }
      },

      TaggedTemplateExpression (path, state) {
        const tag = path.get('tag')
        const quasi = path.get('quasi')
        const binding = tag.isIdentifier()
          ? path.scope.getBinding(tag.node.name)
          : null

        const isNanohtmlBinding = binding ? this.nanohtmlBindings.has(binding) : false
        if (isNanohtmlBinding || isNanohtmlRequireCall(tag.node)) {
          var expressions = quasi.node.expressions
          var getexpr = function (i) { return expressions[i] }
          var res = apply(path.node.tag, [ quasi.node.quasis.map(cooked) ].concat(expressions.map(expr)), getexpr)
          if (res) {
            path.replaceWith(res)
          } else {
            path.remove()
          }
        }
      }
    }
  }
}

function cooked (node) { return node.value.cooked }
function expr (val, i) { return transform.expr(i) }
