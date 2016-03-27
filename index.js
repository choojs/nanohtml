var hyperx = require('hyperx')
var createEl = require('./create-element')

module.exports = hyperx(createEl)
module.exports.createElement = createEl
