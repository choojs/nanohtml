var assert = require('assert')
var Context = require('./context')

module.exports = Partial

/**
 * Holder for tagged template litteral
 * @param {Array} tmpl The unique array produced by a tagged template litteral
 * @param {Array} values Rest arguments as provided to tagged template litteral
 */
function Partial (tmpl, values, ctx) {
  this.key = tmpl
  this.template = tmpl
  this.values = values
  ctx = ctx || new Context()
  assert(ctx instanceof Context, 'nanohtml: ctx should be type Context')
  this.context = ctx
}
