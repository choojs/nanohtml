'use strict'

const camelCase = require('camel-case')
const hyperx = require('hyperx')
const SVG_TAGS = require('./svg-tags')
const BOOL_PROPS = require('./bool-props')
const DIRECT_PROPS = require('./direct-props')
const SUPPORTED_VIEWS = require('./supported-views')

const SVGNS = 'http://www.w3.org/2000/svg'
const XLINKNS = 'http://www.w3.org/1999/xlink'

/**
 * Try to return a nice variable name for an element based on its HTML id,
 * classname, or tagname.
 */
function getElementName (props, tag) {
  if (typeof props.id === 'string' && !placeholderRe.test(props.id)) {
    return camelCase(props.id)
  }
  if (typeof props.className === 'string' && !placeholderRe.test(props.className)) {
    return camelCase(props.className.split(' ')[0])
  }
  return tag || 'nanohtml'
}

/**
 * Regex for detecting placeholders.
 */
const placeholderRe = /\0(\d+)\0/g

/**
 * Get a placeholder string for a numeric ID.
 */
const getPlaceholder = (i) => `\u0000${i}\u0000`

/**
 * Remove a binding and its import or require() call from the file.
 */
function removeBindingImport (binding) {
  const path = binding.path
  if (path.parentPath.isImportDeclaration() &&
      // Remove the entire Import if this is the only imported binding.
      path.parentPath.node.specifiers.length === 1) {
    path.parentPath.remove()
  } else {
    path.remove()
  }
}

module.exports = (babel) => {
  const t = babel.types

  /**
   * Returns an object which specifies the custom elements by which a built-in is extended.
   */
  const createExtendsObjectExpression = (is) =>
    t.objectExpression([t.objectProperty(t.identifier('is'), t.stringLiteral(is))])

  /**
   * Returns a node that creates a namespaced HTML element.
   */
  const createNsElement = (ns, tag) =>
    t.callExpression(
      t.memberExpression(t.identifier('document'), t.identifier('createElementNS')),
      [ns, t.stringLiteral(tag)]
    )

  /**
   * Returns a node that creates a extended namespaced HTML element.
   */
  const createNsCustomBuiltIn = (ns, tag, is) =>
    t.callExpression(
      t.memberExpression(t.identifier('document'), t.identifier('createElementNS')),
      [ns, t.stringLiteral(tag), createExtendsObjectExpression(is)]
    )

  /**
   * Returns a node that creates an element.
  */
  const createElement = (tag) =>
    t.callExpression(
      t.memberExpression(t.identifier('document'), t.identifier('createElement')),
      [t.stringLiteral(tag)]
    )

  /**
   * Returns a node that creates an extended element.
   */
  const createCustomBuiltIn = (tag, is) =>
    t.callExpression(
      t.memberExpression(t.identifier('document'), t.identifier('createElement')),
      [t.stringLiteral(tag), createExtendsObjectExpression(is)]
    )

  /**
   * Returns a node that creates a comment.
   */
  const createComment = (text) =>
    t.callExpression(
      t.memberExpression(t.identifier('document'), t.identifier('createComment')),
      [t.stringLiteral(text)]
    )

  /**
   * Returns a node that creates a fragment.
   */
  const createFragment = (text) =>
    t.callExpression(
      t.memberExpression(t.identifier('document'), t.identifier('createDocumentFragment')),
      []
    )

  /**
   * Returns a node that sets a DOM property.
   */
  const setDomProperty = (id, prop, value) =>
    t.assignmentExpression('=',
      t.memberExpression(id, t.identifier(prop)),
      value)

  /**
   * Returns a node that sets a DOM attribute.
   */
  const setDomAttribute = (id, attr, value) =>
    t.callExpression(
      t.memberExpression(id, t.identifier('setAttribute')),
      [t.stringLiteral(attr), value])

  const setDomAttributeNS = (id, attr, value, ns = t.nullLiteral()) =>
    t.callExpression(
      t.memberExpression(id, t.identifier('setAttributeNS')),
      [ns, t.stringLiteral(attr), value])

  /**
   * Returns a node that sets a boolean DOM attribute.
   */
  const setBooleanAttribute = (id, attr, value) =>
    t.logicalExpression('&&', value,
      setDomAttribute(id, attr, t.stringLiteral(attr)))

  /**
   * Returns a node that appends children to an element.
   */
  const appendChild = (appendChildId, id, children) =>
    t.callExpression(
      appendChildId,
      [id, t.arrayExpression(children)]
    )

  const addDynamicAttribute = (helperId, id, attr, value) =>
    t.callExpression(helperId, [id, attr, value])

  /**
   * Wrap a node in a String() call if it may not be a string.
   */
  const ensureString = (node) => {
    if (t.isStringLiteral(node)) {
      return node
    }
    return t.callExpression(t.identifier('String'), [node])
  }

  /**
   * Concatenate multiple parts of an HTML attribute.
   */
  const concatAttribute = (left, right) =>
    t.binaryExpression('+', left, right)

  /**
   * Check if a node is *not* the empty string.
   * (Inverted so it can be used with `[].map` easily)
   */
  const isNotEmptyString = (node) =>
    !t.isStringLiteral(node, { value: '' })

  const isEmptyTemplateLiteral = (node) => {
    return t.isTemplateLiteral(node) &&
      node.expressions.length === 0 &&
      node.quasis.length === 1 &&
      t.isTemplateElement(node.quasis[0]) &&
      node.quasis[0].value.raw === ''
  }

  /**
   * Transform a template literal into raw DOM calls.
   */
  const nanohtmlify = (path, state) => {
    if (isEmptyTemplateLiteral(path.node)) {
      return t.unaryExpression('void', t.numericLiteral(0))
    }

    const quasis = path.node.quasis.map((quasi) => quasi.value.cooked)
    const expressions = path.node.expressions
    const expressionPlaceholders = expressions.map((expr, i) => getPlaceholder(i))

    const root = hyperx(transform, {
      comments: true,
      createFragment: children => transform('nanohtml-fragment', {}, children)
    }).apply(null, [quasis].concat(expressionPlaceholders))

    /**
     * Convert placeholders used in the template string back to the AST nodes
     * they reference.
     */
    function convertPlaceholders (value) {
      // Probably AST nodes.
      if (typeof value !== 'string') {
        return [value]
      }

      const items = value.split(placeholderRe)
      let placeholder = true
      return items.map((item) => {
        placeholder = !placeholder
        return placeholder ? expressions[item] : t.stringLiteral(item)
      })
    }

    /**
     * Transform a hyperx vdom element to an AST node that creates the element.
     */
    function transform (tag, props, children) {
      if (tag === '!--') {
        return createComment(props.comment)
      }

      const id = path.scope.generateUidIdentifier(getElementName(props, tag))
      path.scope.push({ id })

      const result = []

      if (tag === 'nanohtml-fragment') {
        result.push(t.assignmentExpression('=', id, createFragment()))
      } else {
        var isCustomElement = props.is
        delete props.is

        // Use the SVG namespace for svg elements.
        if (SVG_TAGS.includes(tag)) {
          state.svgNamespaceId.used = true

          if (isCustomElement) {
            result.push(t.assignmentExpression('=', id, createNsCustomBuiltIn(state.svgNamespaceId, tag, isCustomElement)))
          } else {
            result.push(t.assignmentExpression('=', id, createNsElement(state.svgNamespaceId, tag)))
          }
        } else if (isCustomElement) {
          result.push(t.assignmentExpression('=', id, createCustomBuiltIn(tag, isCustomElement)))
        } else {
          result.push(t.assignmentExpression('=', id, createElement(tag)))
        }
      }

      Object.keys(props).forEach((propName) => {
        const dynamicPropName = convertPlaceholders(propName).filter(isNotEmptyString)
        // Just use the normal propName if there are no placeholders
        if (dynamicPropName.length === 1 && t.isStringLiteral(dynamicPropName[0])) {
          propName = dynamicPropName[0].value
        } else {
          state.setAttributeId.used = true
          result.push(addDynamicAttribute(state.setAttributeId, id, dynamicPropName.reduce(concatAttribute),
            convertPlaceholders(props[propName]).filter(isNotEmptyString).reduce(concatAttribute)))
          return
        }

        // don’t convert to lowercase, since some attributes are case-sensetive
        let attrName = propName

        if (attrName === 'className') {
          attrName = 'class'
        }

        if (attrName === 'htmlFor') {
          attrName = 'for'
        }

        // abc.onclick = xyz
        if (attrName.slice(0, 2) === 'on' || DIRECT_PROPS.indexOf(attrName) > -1) {
          const value = convertPlaceholders(props[propName]).filter(isNotEmptyString)
          result.push(setDomProperty(id, attrName,
            value.length === 1
              ? value[0]
              : value.map(ensureString).reduce(concatAttribute)
          ))

          return
        }

        // Dynamic boolean attributes
        if (BOOL_PROPS.indexOf(attrName) !== -1 && props[propName] !== attrName) {
          // if (xyz) abc.setAttribute('disabled', 'disabled')
          result.push(setBooleanAttribute(id, attrName,
            convertPlaceholders(props[propName])
              .filter(isNotEmptyString)[0]))
          return
        }

        // use proper xml namespace for svg use links
        if (attrName === 'xlink:href') {
          const value = convertPlaceholders(props[propName])
            .map(ensureString)
            .reduce(concatAttribute)

          state.xlinkNamespaceId.used = true
          result.push(setDomAttributeNS(id, attrName, value, state.xlinkNamespaceId))

          return
        }

        // abc.setAttribute('class', xyz)
        result.push(setDomAttribute(id, attrName,
          convertPlaceholders(props[propName])
            .map(ensureString)
            .reduce(concatAttribute)
        ))
      })

      if (Array.isArray(children)) {
        const realChildren = children.map(convertPlaceholders)
          // Flatten
          .reduce((flat, arr) => flat.concat(arr), [])
          // Remove empty strings since they don't affect output
          .filter(isNotEmptyString)

        if (realChildren.length > 0) {
          state.appendChildId.used = true
          result.push(appendChild(state.appendChildId, id, realChildren))
        }
      }

      result.push(id)
      return t.sequenceExpression(result)
    }

    return root
  }

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
    return SUPPORTED_VIEWS.indexOf(importFrom) !== -1
  }

  return {
    pre () {
      this.nanohtmlBindings = new Set()
    },
    post () {
      this.nanohtmlBindings.clear()
    },

    visitor: {
      Program: {
        enter (path) {
          this.appendChildId = path.scope.generateUidIdentifier('appendChild')
          this.setAttributeId = path.scope.generateUidIdentifier('setAttribute')
          this.svgNamespaceId = path.scope.generateUidIdentifier('svgNamespace')
          this.xlinkNamespaceId = path.scope.generateUidIdentifier('xlinkNamespace')
        },
        exit (path, state) {
          const appendChildModule = this.opts.appendChildModule || 'nanohtml/lib/append-child'
          const setAttributeModule = this.opts.setAttributeModule || 'nanohtml/lib/set-attribute'
          const useImport = this.opts.useImport

          if (this.appendChildId.used) {
            addImport(this.appendChildId, appendChildModule)
          }
          if (this.setAttributeId.used) {
            addImport(this.setAttributeId, setAttributeModule)
          }
          if (this.svgNamespaceId.used) {
            path.scope.push({
              id: this.svgNamespaceId,
              init: t.stringLiteral(SVGNS)
            })
          }
          if (this.xlinkNamespaceId.used) {
            path.scope.push({
              id: this.xlinkNamespaceId,
              init: t.stringLiteral(XLINKNS)
            })
          }

          function addImport (id, source) {
            if (useImport) {
              path.unshiftContainer('body', t.importDeclaration([
                t.importDefaultSpecifier(id)
              ], t.stringLiteral(source)))
            } else {
              path.scope.push({
                id: id,
                init: t.callExpression(t.identifier('require'), [t.stringLiteral(source)])
              })
            }
          }
        }
      },

      /**
       * Collect nanohtml variable names and remove their imports if necessary.
       */
      ImportDeclaration (path, state) {
        const importFrom = path.get('source').node.value
        if (SUPPORTED_VIEWS.indexOf(importFrom) !== -1) {
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
        const binding = tag.isIdentifier()
          ? path.scope.getBinding(tag.node.name)
          : null

        const isNanohtmlBinding = binding ? this.nanohtmlBindings.has(binding) : false
        if (isNanohtmlBinding || isNanohtmlRequireCall(tag.node)) {
          let newPath = nanohtmlify(path.get('quasi'), state)
          // If this template string is the only expression inside an arrow
          // function, the `nanohtmlify` call may have introduced new variables
          // inside its scope and forced it to become an arrow function with
          // a block body. In that case if we replace the old `path`, it
          // doesn't do anything. Instead we need to find the newly introduced
          // `return` statement.
          if (path.parentPath.isArrowFunctionExpression()) {
            const statements = path.parentPath.get('body.body')
            if (statements) {
              path = statements.find((st) => st.isReturnStatement())
            }
          }
          path.replaceWith(newPath)

          // Remove the import or require() for the tag if it's no longer used
          // anywhere.
          if (binding) {
            binding.dereference()
            if (!binding.referenced) {
              removeBindingImport(binding)
            }
          }
        }
      }
    }
  }
}
