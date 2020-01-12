module.exports = Partial

function Partial (tmpl, values, render) {
  this.key = tmpl
  this.render = render
  this.values = function () {
    return values
  }
}
