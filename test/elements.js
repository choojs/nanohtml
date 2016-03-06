var test = require('tape')
var bel = require('../')

test('create inputs', function (t) {
  t.plan(5)

  var expected = 'testing'
  var result = bel`<input type="text" value="${expected}" />`
  t.equal(result.tagName, 'INPUT', 'created an input')
  t.equal(result.value, expected, 'set the value of an input')

  result = bel`<input type="checkbox" checked="${true}" disabled="${false}" />`
  t.equal(result.getAttribute('type'), 'checkbox', 'created a checkbox')
  t.equal(result.getAttribute('checked'), 'checked', 'set the checked attribute')
  t.equal(result.getAttribute('disabled'), null, 'should not have set the disabled attribute')

  t.end()
})

test('can update and submit inputs', function (t) {
  t.plan(3)
  document.body.innerHTML = ''
  var expected = 'testing'
  function render (data, onsubmit) {
    var input = bel`<input type="text" value="${data}" />`
    return bel`<div>
      ${input}
      <button onclick=${function () {
        onsubmit(input.value)
      }}>submit</button>
    </div>`
  }
  var count = 0
  var result = render(expected, function onsubmit (newvalue) {
    count++
    if (count === 1) {
      t.equal(newvalue, 'changed')
      result.update(render('changed again'), onsubmit)
      process.nextTick(function () {
        document.querySelector('button').click()
      })
    } else {
      t.equal(newvalue, 'changed again')
      document.body.innerHTML = ''
      t.end()
    }
  })
  document.body.appendChild(result)
  t.equal(document.querySelector('input').value, expected, 'set the input correctly')
  document.querySelector('input').value = 'changed'
  document.querySelector('button').click()
})

test('create a loading app then replace it', function (t) {
  t.plan(3)
  document.body.innerHTML = ''
  var time = 100

  // Create a loading app
  var app = bel`<div class="loading">
    Loading...
  </div>`
  document.body.appendChild(app)

  // Some time later, the app has loaded
  setTimeout(function () {
    var content = nestedElement(onaction)
    app.update(template(content))
  }, time * 1)

  // Some time after that, a button is clicked
  setTimeout(function () {
    t.equal(document.querySelector('nav').textContent, 'NAV', 'Past loading state')
    var buttons = document.querySelectorAll('button')
    buttons[0].click()
  }, time * 2)

  // Then another button is clicked that replaces the app contents
  setTimeout(function () {
    var buttons = document.querySelectorAll('button')
    t.equal(buttons[0].textContent, 'changed 1', 'Nested element button updated itself')
    buttons[1].click()
  }, time * 3)

  // Finally we check that the app got updated
  setTimeout(function () {
    var page = document.querySelector('.page')
    t.equal(page.textContent, 'PAGE!', 'Action from below updated the entire page')
    document.body.innerHTML = ''
    t.end()
  }, time * 4)

  // When we get an action from below
  function onaction () {
    var page = bel`<div class="page">PAGE!</div>`
    app.update(template(page))
  }

  // Template for our app
  function template (content) {
    return bel`<article class="app">
      <nav>NAV</nav>
      <section class="content">${content}</section>
    </article>`
  }

  // Some element we are nesting in our app that updates itself
  function nestedElement (onselected) {
    var element = render('first')
    return element
    function render (label) {
      return bel`<div class="nested-element">
        <h3>Header</h3>
        ${button(label + ' 1', function () {
          element.update(render('changed'))
        })}
        ${button(label + ' 2', onselected)}
      </div>`
    }
    function button (label, onclick) {
      return bel`<button onclick=${onclick}>${label}</button>`
    }
  }
})

test('svg', function (t) {
  t.plan(2)
  var result = bel`<svg width="150" height="100" viewBox="0 0 3 2">
    <rect width="1" height="2" x="0" fill="#008d46" />
  </svg>`
  t.equal(result.tagName, 'svg', 'create svg tag')
  t.equal(result.childNodes[1].tagName, 'rect', 'created child rect tag')
  t.end()
})
