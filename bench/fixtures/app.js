module.exports = function (html) {
  var greeting = 'Hello'
  var name = 'special characters, <, >, &'
  var drinks = [
    { name: 'Cafe Latte', price: 3.0 },
    { name: 'Cappucino', price: 2.9 },
    { name: 'Club Mate', price: 2.2 },
    { name: 'Berliner Weiße', price: 3.5 }
  ]

  var listeners = []
  function onChange (listener) {
    listeners.push(listener)
  }
  function notifyChange () {
    listeners.forEach((listener) => listener())
  }

  function devareDrink (drink) {
    var index = drinks.indexOf(drink)
    if (index >= 0) {
      drinks.splice(index, 1)
    }
    notifyChange()
  }

  function drinkView (drink, devareDrink) {
    return html`
      <li>
        ${drink.name} is € ${drink.price}
        <a href="#" onclick=${() => devareDrink(drink)}>Give me!</a>
      </li>
    `
  }

  function mainView (greeting, name, drinks, devareDrink) {
    return html`
      <div>
        <p>${greeting}, ${name}!</p>
        ${drinks.length > 0 ? html`
          <ul>
            ${drinks.map(drink => drinkView(drink, devareDrink))}
          </ul>
        ` : html`
          <p>All drinks are gone!</p>
        `}
      </div>
    `
  }

  function render () {
    return mainView(greeting, name, drinks, devareDrink)
  }

  return {
    render: render,
    onChange: onChange
  }
}
