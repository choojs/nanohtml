var test = require('tape')
var document = require('global/document')
var bel = require('../')

test('creates an element', function (t) {
  t.plan(3)
  var button = bel`<button onclick=${function () {
    onselected('success')
  }}>click me</button>`
  var result = bel`<ul>
    <li>${button}</li>
  </ul>`
  function onselected (result) {
    t.equal(result, 'success')
    t.end()
  }
  t.equal(result.tagName, 'UL')
  t.equal(result.querySelector('button').textContent, 'click me')
  button.click()
})

test('update', function (t) {
  t.plan(2)
  document.body.innerHTML = ''

  function render (data) {
    return bel`<strong>${data}</strong>`
  }
  var result = render('before')
  document.body.appendChild(result)

  var changed = render('after')
  result = result.update(changed)

  t.equal(result.tagName, 'STRONG', 'element was updated')
  t.equal(result.textContent, 'after', 'element was updated')

  document.body.innerHTML = ''
  t.end()
})

test('update with child elements', function (t) {
  t.plan(3)
  document.body.innerHTML = ''

  function child (data) {
    var childel = bel`<li onclick=${function () {
      childel.update(child('changed by child'))
    }}>${data}</li>`
    return childel
  }
  function render (data) {
    return bel`<ul>${child(data)}</ul>`
  }
  var result = render('before')
  document.body.appendChild(result)

  t.equal(result.textContent, 'before')

  var changed = render('changed')
  result = result.update(changed)

  t.equal(result.textContent, 'changed')

  document.querySelector('li').click()

  t.equal(result.textContent, 'changed by child')

  document.body.innerHTML = ''
  t.end()
})

test('using class and className', function (t) {
  t.plan(2)
  var result = bel`<div className="test1"></div>`
  t.equal(result.className, 'test1')
  result = bel`<div class="test2 another"></div>`
  t.equal(result.className, 'test2 another')
  t.end()
})
