var hyperx = require('hyperx')
var createElement = require('./create-element')

module.exports = hyperx(createElement)
module.exports.default = module.exports
module.exports.createElement = createElement
