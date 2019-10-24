var doc = typeof window !== 'undefined'
  ? document
  : new (require('jsdom').JSDOM)().window.document

module.exports.document = doc
module.exports.html = typeof window !== 'undefined'
  ? require('../../')
  : require('../../dom')(doc)
