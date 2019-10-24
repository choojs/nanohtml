var test = require('tape')
if (typeof window !== "undefined") {
  var document = window.document
  var html = require('../../')
} else {
  var { document, html } = require('./html')
}

test('multiple elements', function (t) {
  var multiple = html`<li>Hamburg</li><li>Helsinki</li>haha<li>Berlin<div>test</div></li>`

  var list = document.createElement('ul')
  list.appendChild(multiple)
  t.equal(list.children.length, 3, '3 children')
  t.equal(list.childNodes.length, 4, '4 childNodes')
  t.equal(list.children[0].tagName, 'LI', 'list tag name')
  t.equal(list.children[0].textContent, 'Hamburg')
  t.equal(list.children[1].textContent, 'Helsinki')
  t.equal(list.children[2].textContent, 'Berlintest')
  t.equal(list.querySelector('div').textContent, 'test', 'created sub-element')
  t.equal(list.childNodes[2].nodeValue, 'haha')
  t.end()
})

test('nested fragments', function (t) {
  var fragments = html`<div>1</div>ab${html`cd<div>2</div>between<div>3</div>`}<div>4</div>`
  t.equals(fragments.textContent, '1abcd2between34')
  t.equals(fragments.children.length, 4)
  t.equals(fragments.childNodes[4].textContent, 'between')
  t.equals(fragments.childNodes.length, 7)
  t.end()
})

test('multiple elements mixed with array', function (t) {
  var arr = [html`<li>Helsinki</li>`, null, html`<li>Stockholm</li>`]
  var multiple = html`<li>Hamburg</li>${arr}<li>Berlin</li>`

  var list = document.createElement('ul')
  list.appendChild(multiple)
  t.equal(list.children.length, 4, '4 children')
  t.equal(list.children[0].tagName, 'LI', 'list tag name')
  t.equal(list.children[0].textContent, 'Hamburg')
  t.equal(list.children[1].textContent, 'Helsinki')
  t.equal(list.children[2].textContent, 'Stockholm')
  t.equal(list.children[3].textContent, 'Berlin')
  t.end()
})
