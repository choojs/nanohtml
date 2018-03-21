function nanohtmlRawServer (tag) {
  var wrapper = new String(tag) // eslint-disable-line no-new-wrappers
  wrapper.__encoded = true
  return wrapper
}

module.exports = nanohtmlRawServer
