var test = require('tape')
var { html, render, Ref } = require('../../')

test('renders html', function (t) {
  var el = render(html`<span>Hello ${'planet'}!</span>`)
  t.ok(el instanceof window.Element, 'renders an element')
  t.equal(el.innerText, 'Hello planet!', 'renders partials')
  t.end()
})

test('renders plain text', function (t) {
  var div = document.createElement('div')
  var el = render(html`Hello world!`)
  div.appendChild(el)
  t.equal(div.innerText, 'Hello world!', 'text rendered')
  t.end()
})

test('renders anything', function (t) {
  var div = document.createElement('div')
  var el = render(html`${['Hello world!']}`)
  div.appendChild(el)
  t.equal(div.innerText, 'Hello world!', 'text rendered')
  t.end()
})

test('renders nested html', function (t) {
  var el = render(html`<span>Hello ${html`<span>planet</span>`}!</span>`)
  t.equal(el.childElementCount, 1, 'has children')
  t.equal(el.firstElementChild.innerText, 'planet', 'children rendered')
  t.end()
})

test('renders array of children', function (t) {
  var el = render(html`<span>Hello ${[html`<span>planet</span>`]}!</span>`)
  t.equal(el.childElementCount, 1, 'has children')
  t.equal(el.firstElementChild.innerText, 'planet', 'children rendered')
  t.end()
})

test('fragments', function (t) {
  t.test('top level fragment', function (t) {
    var div = document.createElement('div')
    var el = render(html`<span>Hello</span> <span>${'world'}!</span>`)
    div.appendChild(el)
    t.equal(div.childElementCount, 2, 'has children')
    t.equal(div.innerText, 'Hello world!', 'children rendered')
    t.end()
  })

  t.test('nested fragment', function (t) {
    var div = document.createElement('div')
    var el = render(html`<div>${html`<span>Hello</span> <span>${'world'}!</span>`}</div>`)
    div.appendChild(el)
    t.equal(div.firstElementChild.childElementCount, 2, 'has nested children')
    t.equal(div.innerText, 'Hello world!', 'nested children rendered')
    t.end()
  })

  t.test('fragment with top level partial', function (t) {
    var div = document.createElement('div')
    var el = render(html`<span>Hello</span> ${html`<span>${'world'}!</span>`}`)
    div.appendChild(el)
    t.equal(div.childElementCount, 2, 'has children')
    t.equal(div.innerText, 'Hello world!', 'children rendered')
    t.end()
  })

  t.test('fragment with only partial', function (t) {
    var div = document.createElement('div')
    var el = render(html`${html`<span>Hello</span> <span>${'world'}!</span>`}`)
    div.appendChild(el)
    t.equal(div.childElementCount, 2, 'has children')
    t.equal(div.innerText, 'Hello world!', 'children rendered')
    t.end()
  })

  t.test('fragment with mixed content', function (t) {
    var arr = [html`<li>Helsinki</li>`, null, html`<li>Stockholm</li>`]
    var multiple = render(html`<li>Hamburg</li>${arr}<li>Berlin</li>`)

    var list = document.createElement('ul')
    list.appendChild(multiple)
    t.equal(list.children.length, 4, '4 children')
    t.equal(list.children[0].tagName, 'LI', 'list tag name')
    t.equal(list.children[0].textContent, 'Hamburg', 'first child in place')
    t.equal(list.children[1].textContent, 'Helsinki', 'second child in place')
    t.equal(list.children[2].textContent, 'Stockholm', 'third child in place')
    t.equal(list.children[3].textContent, 'Berlin', 'fourth child in place')
    t.end()
  })
})

test('can mount in DOM', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span><span>Hi <strong>world</strong>!</span></span>'
  var firstChild = div.firstElementChild
  document.body.appendChild(div)

  render(html`<div id="${id}"><span>Hello ${html`<span>planet</span>`}!</span></div>`, div)
  var res = document.getElementById(id)
  t.ok(res, 'element was mounted')
  t.ok(res.isSameNode(div), 'morphed onto existing node')
  t.ok(firstChild.isSameNode(res.firstElementChild), 'children morphed too')
  t.equal(res.innerText, 'Hello planet!', 'content match')
  document.body.removeChild(div)
  t.end()
})

test('can mount fragments', function (t) {
  var div = document.createElement('div')
  render(html`<span>Hello</span> <span>world!</span>`, div)
  t.equal(div.childElementCount, 2, 'has children')
  t.equal(div.innerText, 'Hello world!', 'children rendered')
  t.end()
})

test('tolerates DOM changes in-between renders', function (t) {
  var ol = document.createElement('ol')
  var two = html`<li id="two">2</li>`
  render(main(), ol)
  ol.children.two.remove()
  ol.children.three.remove()
  ol.children.five.remove()
  t.equal(ol.textContent, '14', 'Children removed')
  two = '2'
  render(main(), ol)
  t.equal(ol.textContent, '12345', 'All children added back')
  t.end()

  function main () {
    return html`
      <ol>
        ${html`<li id="one">1</li>`}
        ${two}
        ${[
          html`<li id="three">3</li>`,
          html`<li id="four">4</li>`
        ]}
        ${html`<li id="five">5</li>`}
      </ol>
    `
  }
})

test('updates in place', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(main('planet'), div)
  var res = document.getElementById(id)
  t.equal(res.innerText, 'planet', 'content mounted')
  render(main('world'), div)
  t.equal(res.innerText, 'world', 'content updated')
  document.body.removeChild(div)
  t.end()

  function main (text) {
    return html`<div><span>Hello ${html`<span id="${id}">${text}</span>`}!</span></div>`
  }
})

test('persists in DOM between mounts', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <span>world</span>!</span>'
  document.body.appendChild(div)

  render(foo('planet'), div)
  var res = document.getElementById(id)
  t.equal(res.innerText, 'planet', 'did mount')

  render(bar('world'), div)
  var updated = document.getElementById(id)
  t.ok(res.isSameNode(updated), 'same node')
  t.equal(updated.innerText, 'world', 'content updated')
  document.body.removeChild(div)
  t.end()

  function foo (text) {
    return html`<div><span>Hello ${name(text)}!</span></div>`
  }

  function bar (text) {
    return html`<div><span>Hello ${name(text)}!</span></div>`
  }

  function name (text) {
    return html`<span id="${id}">${text}</span>`
  }
})

test('updating with null', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(main('planet'), div)
  var res = document.getElementById(id)
  t.equal(res.innerHTML, 'Hello planet!', 'did mount')
  render(main(false), div)
  t.equal(res.innerHTML, 'Hello !', 'node was removed')
  render(main('world'), div)
  t.equal(res.innerHTML, 'Hello world!', 'node added back')
  document.body.removeChild(div)
  t.end()

  function main (text) {
    return html`<div><span id="${id}">Hello ${text || null}!</span></div>`
  }
})

test('updating from null', function (t) {
  var id = makeId()
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(main(false), div)
  var res = document.getElementById(id)
  t.equal(res.innerHTML, 'Hello !', 'node was removed')
  render(main('planet'), div)
  t.equal(res.innerHTML, 'Hello planet!', 'did mount')
  render(main('world'), div)
  t.equal(res.innerHTML, 'Hello world!', 'node added back')
  document.body.removeChild(div)
  t.end()

  function main (text) {
    return html`<div><span id="${id}">Hello ${text || null}!</span></div>`
  }
})

test('updating with array', function (t) {
  var div = document.createElement('div')
  div.innerHTML = 'Hi <span>world</span>!'
  document.body.appendChild(div)

  var children = [
    html`<span>planet</span>`,
    html`<span>world</span>`
  ]
  render(main(children[0]), div)
  var firstChild = div.firstElementChild
  t.equal(div.innerText, 'Hello planet!', 'child mounted')
  render(main(children), div)
  t.equal(div.innerText, 'Hello planetworld!', 'all children mounted')
  t.equal(div.firstElementChild, firstChild, 'child remained in place')
  document.body.removeChild(div)
  t.end()

  function main (children) {
    return html`<div>Hello ${children}!</div>`
  }
})

test('alternating partials', function (t) {
  var id = makeId()
  var world = html`<span>world</span>`
  var planet = html`<span>planet</span>`
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(main(planet), div)
  var res = document.getElementById(id)
  t.equal(res.innerText, 'Hello planet!', 'did mount')
  render(main(world), div)
  t.equal(res.innerText, 'Hello world!', 'did update')
  document.body.removeChild(div)
  t.end()

  function main (child) {
    return html`<div><span id="${id}">Hello ${child}!</span></div>`
  }
})

test('reordering children', function (t) {
  var ids = [makeId(), makeId()]
  var children = [
    html`<span id="${ids[0]}">world</span>`,
    html`<span id="${ids[1]}">planet</span>`
  ]
  var div = document.createElement('div')
  div.innerHTML = '<span>Hi <strong>world</strong>!</span>'
  document.body.appendChild(div)

  render(main(children), div)
  var world = document.getElementById(ids[0])
  var planet = document.getElementById(ids[1])
  t.equal(world.nextSibling, planet, 'mounted in order')
  t.equal(div.innerText, 'Hello worldplanet!', 'children in order')
  render(main(children.reverse()), div)
  world = document.getElementById(ids[0])
  planet = document.getElementById(ids[1])
  t.equal(planet.nextElementSibling, world, 'children reordered')
  t.equal(div.innerText, 'Hello planetworld!', 'children in (reversed) order')
  document.body.removeChild(div)
  t.end()

  function main (children) {
    return html`<div><span>Hello ${children}!</span></div>`
  }
})

test('async partials', function (t) {
  t.test('resolves generators', function (t) {
    t.plan(5)
    var div = document.createElement('div')
    render(html`<div data-test="${echo('test')}">Hello ${outer('world')}!</div>`, div)
    t.equal(div.innerText, 'Hello world!', 'content rendered')
    t.equal(div.dataset.test, 'test', 'attribute resolved')

    function * outer (text) {
      var res = yield * echo(text)
      t.equal(res, text, 'nested generators are unwound')
      return html`<span>${res}</span>`
    }

    function * echo (arg) {
      var res = yield 'foo'
      t.equal(res, 'foo', 'yielded values are returned')
      return arg
    }
  })

  t.test('resolves promises', function (t) {
    t.plan(4)
    var div = document.createElement('div')
    render(html`<div data-test="${Promise.resolve('test')}">Hello ${Promise.resolve('world')}!</div>`, div)
    t.equal(div.innerText, 'Hello !', 'promise partial left blank')
    t.equal(div.dataset.test, undefined, 'attribute left blank')
    window.requestAnimationFrame(function () {
      t.equal(div.innerText, 'Hello world!', 'content updated once resolved')
      t.equal(div.dataset.test, 'test', 'attribute updated once resolved')
    })
  })

  t.test('recursively resolves nested generators and promises', function (t) {
    t.plan(4)
    var div = document.createElement('div')
    render(html`<div>Hello ${outer('world')}!</div>`, div)
    t.equal(div.innerText, 'Hello !', 'promise partial left blank')
    window.requestAnimationFrame(function () {
      t.equal(div.innerText, 'Hello world!', 'content updated once resolved')
      t.equal(div.firstElementChild.dataset.test, 'test', 'attribute updated once resolved')
    })

    function * outer (text) {
      var res = yield Promise.resolve(inner(text))
      t.equal(res, text, 'yielded promises are resolved')
      return html`<span data-test="${Promise.resolve('test')}">${res}</span>`

      function * inner (text) {
        var res = yield text
        return res
      }
    }
  })

  t.test('top level async generators resolve', function (t) {
    t.plan(3)
    var div = document.createElement('div')
    var res = render(main('world'), div)
    t.ok(res instanceof Promise, 'returns promise')
    t.equal(div.innerText, '', 'nothing renderd async')
    res.then(function () {
      t.equal(div.innerText, 'Hello world!', 'content updated once resolved')
    })

    function * main (text) {
      var res = yield Promise.resolve(text)
      return html`<div>Hello ${res}!</div>`
    }
  })

  t.test('does not succomb to race condition', function (t) {
    t.plan(4)
    var div = document.createElement('div')
    render(Promise.resolve(main(Promise.resolve('world'))), div)
    render(main('planet'), div)
    t.equal(div.innerText, 'Hello planet!', 'sync content rendered')
    t.equal(div.dataset.test, 'planet', 'sync attribute rendered')
    window.requestAnimationFrame(function () {
      t.equal(div.innerText, 'Hello planet!', 'sync content persisted')
      t.equal(div.dataset.test, 'planet', 'sync attribute persisted')
    })

    function main (val) {
      return html`<div data-test="${val}">Hello ${val}!</div>`
    }
  })

  t.test('does not affect ordering', function (t) {
    t.plan(2)
    var state = 0
    var list = render(main())
    t.equal(list.textContent, '1246', 'sync content rendered')
    render(main(), list)
    list.children.four.remove()
    window.requestAnimationFrame(function () {
      t.equal(list.textContent, '1356', 'async content in place')
    })

    function main (val) {
      return html`
        <ul>
          <li>1</li>
          ${state++ ? null : html`<li>2</li>`}
          ${Promise.resolve(html`<li>3</li>`)}
          ${[
            html`<li id="four">4</li>`,
            Promise.resolve(html`<li>5</li>`),
            html`<li>6</li>`
          ]}
        </ul>
      `
    }
  })
})

test('can access elements with ref', function (t) {
  var ref1 = new Ref('test')
  var ref2

  t.throws(function () {
    ref1.className // eslint-disable-line
  }, 'throws when accessing Element prototype property before render')
  t.doesNotThrow(function () {
    ref1.foo // eslint-disable-line
  }, 'does not throw when accessing arbitrary prop')
  t.throws(function () {
    'use strict'
    ref1.className = 'foo'
  }, 'mutating ref before render in strict mode throws')
  t.doesNotThrow(function () {
    ref1.className = 'foo'
  }, 'mutation fails silently in non-strict mode')

  var div = document.createElement('div')
  document.body.appendChild(div)
  render(main(ref1), div)

  t.equal(div.id, 'test', 'custom ref id assigned')
  t.equal(ref1.element, div, 'ref.element references element')
  t.equal(ref1.className, 'test1', 'properties are read from element')
  ref1.className = 'test2'
  t.equal(div.className, 'test2', 'properties are set to element')
  var id = ref2.id
  render(main(ref1), div)
  t.equal(id, ref2.id, 'id persist between renders')
  document.body.removeChild(div)
  t.end()

  function main () {
    ref2 = new Ref()
    return html`
      <div id="${ref1}" class="test1">
        <span id="${ref2}">Hello world!</span>
      </div>
    `
  }
})

function makeId () {
  return 'uid-' + Math.random().toString(36).substr(-4)
}
