var hyperx = require('hyperx')
var nanoHtmlCreateElement = require('./createElement')

module.exports = hyperx(nanoHtmlCreateElement, { comments: true })
module.exports.default = module.exports
module.exports.createElement = nanoHtmlCreateElement
