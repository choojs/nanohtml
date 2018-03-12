module.exports = typeof window !== 'undefined'
  ? nanohtmlRawBrowser
  : nanohtmlRawServer

function nanohtmlRawBrowser (tag) {
  var el = document.createElement('div')
  el.innerHTML = tag
  return toArray(el.childNodes)
}

function nanohtmlRawServer (tag) {
  var wrapper = new String(tag) // eslint-disable-line no-new-wrappers
  wrapper.__encoded = true
  return wrapper
}

function toArray (arr) {
  return Array.isArray(arr) ? arr : [].slice.call(arr)
}
