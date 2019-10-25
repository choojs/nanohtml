var doc = new (require('js' + 'dom').JSDOM)().window.document

module.exports.document = doc
module.exports.html = require('../../dom')(doc)
