import bel from 'bel'

class Component {
  constructor () {
    this.value = 10
  }
  render () {
    return bel`
      <span>${this.value}</span>
    `
  }
}
