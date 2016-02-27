module.exports = function bel_send (el, name) {
  if (!el) {
    throw new Error('Please supply an element')
  }
  name = name || 'action'
  var args = Array.prototype.slice.call(arguments, 2)
  if (args.length === 1) {
    args = args[0]
  }
  var e = new CustomEvent(name, { detail: args })
  el.dispatchEvent(e)
}
