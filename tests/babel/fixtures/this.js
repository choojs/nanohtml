import html from 'nanohtml'

class Component {
  constructor () {
    this.value = 10
  }
  render () {
    return html`
      <span>${this.value}</span>
    `
  }
}
