var test = require('tape')
var { html, render } = require('../../nanohtml')

// TODO: test alternating return value (null/array/partial)

test('fallback is required', function (t) {
  t.throws(function () {
    lazy(html`<span>Hello planet!</span>`)
  }, 'throws when missing fallback')
  t.end()
})

test('renders any type of mixed content', function (t) {
  var noop = Function.prototype
  var div = render(html`
    <div>
      ${lazy('Hello', noop)} ${lazy([html`<span>world</span>`, '!'], noop)}
    </div>
  `)
  t.equal(div.innerText.trim(), 'Hello world!', 'content rendered')
  t.end()
})

test('renders fallback in place of null', function (t) {
  var div = render(html`
    <div>
      ${lazy(null, function () {
        return html`<span>Hello world!</span>`
      })}
    </div>
  `)
  t.equal(div.innerText.trim(), 'Hello world!', 'fallback rendered')
  t.end()
})

test('renders async partial', function (t) {
  t.plan(2)
  var div = render(html`
    <div>
      ${lazy(Promise.resolve(html`<span>Hello planet!</span>`), function () {
        return html`<span>Hello world!</span>`
      })}
    </div>
  `)
  t.equal(div.innerText.trim(), 'Hello world!', 'fallback rendered')
  window.requestAnimationFrame(function () {
    t.equal(div.innerText.trim(), 'Hello planet!', 'async content rendered')
  })
})

test('forwards error to fallback', function (t) {
  t.plan(3)
  var state = 0
  var div = render(html`
    <div>
      ${lazy(Promise.reject(new Error('test')), function (err) {
        if (state++) t.equal(err.message, 'test', 'rejection is forwarded')
        return html`<span>Hello world!</span>`
      })}
    </div>
  `)
  t.equal(div.innerText.trim(), 'Hello world!', 'fallback rendered')
  window.requestAnimationFrame(function () {
    t.equal(div.innerText.trim(), 'Hello world!', 'fallback persisted')
  })
})

test('does not affect ordering', function (t) {
  t.plan(2)
  var state = 0
  var list = render(main())
  t.equal(list.innerText.replace(/\s/g, ''), '1246', 'sync content rendered')
  render(main(), list)
  window.requestAnimationFrame(function () {
    t.equal(list.innerText.replace(/\s/g, ''), '13456', 'async content in place')
  })

  function main (val) {
    return html`
      <ul>
        <li>1</li>
        ${state++ ? null : html`<li>2</li>`}
        ${Promise.resolve(html`<li>3</li>`)}
        ${[
          html`<li>4</li>`,
          Promise.resolve(html`<li>5</li>`),
          html`<li>6</li>`
        ]}
      </ul>
    `
  }
})
