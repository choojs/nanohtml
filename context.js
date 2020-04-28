/**
 * Component context hoding state and hooks
 * @param {Array} stack Initial stack
 * @return {Context}
 */
module.exports = class Context extends Map {
  constructor () {
    super()
    this.counter = 0
    this.stack = []
  }
}
