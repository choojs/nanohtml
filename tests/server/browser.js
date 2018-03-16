var server = require('../../lib/server')

module.exports = function () {
  var str = server.apply(null, arguments).toString()
  var el = document.createElement('body')
  el.innerHTML = str
  var result = el.firstElementChild
  // Pretend to also be a string, for embedding inside other server rendered strings
  result.__encoded = true
  result.toString = function () { return str }

  return result
}
