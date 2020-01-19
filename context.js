var assert = require('assert')

module.exports = Context

/**
 * Component context hoding state and hooks
 * @param {Array} stack Initial stack
 * @return {Context}
 */
function Context (stack) {
  assert(!stack || Array.isArray(stack), 'nanohtml: stack should be type array')
  this.stack = stack || []
  this.counter = 0
}
