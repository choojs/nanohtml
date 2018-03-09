var _appendChild = require('nanohtml/lib/append-child');

class Component {
  constructor() {
    this.value = 10;
  }
  render() {
    var _span;

    return _span = document.createElement('span'), _appendChild(_span, [this.value]), _span;
  }
}
