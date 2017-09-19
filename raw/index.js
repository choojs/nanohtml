'use strict';

var _templateObject = _taggedTemplateLiteral(['<div></div>'], ['<div></div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var bel = require('../');

function rawCreateElement(tag) {
  if (typeof window !== 'undefined') {
    return browser();
  } else {
    return server();
  }

  function browser() {
    var el = bel(_templateObject);
    el.innerHTML = tag;
    return toArray(el.childNodes);
  }

  function server() {
    var wrapper = new String(tag); // eslint-disable-line no-new-wrappers
    wrapper.__encoded = true;
    return wrapper;
  }
}

function toArray(arr) {
  return Array.isArray(arr) ? arr : [].slice.call(arr);
}

module.exports = rawCreateElement;
