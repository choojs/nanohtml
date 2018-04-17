var html = {
  'createElement': require('nanohtml/lib/createElement')
};


class Component {
  constructor() {
    this.value = 10;
  }
  render() {
    return html.createElement('span', {}, [this.value]);
  }
}
