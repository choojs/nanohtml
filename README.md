# nanohtml
[![npm version][2]][3] [![build status][4]][5]
[![downloads][8]][9] [![js-standard-style][10]][11]

HTML template strings for the Browser with support for Server Side
Rendering in Node.

## Installation
```sh
$ npm install nanohtml
```

## Usage
### Browser
```js
var html = require('nanohtml')

var el = html`
  <body>
    <h1>Hello planet</h1>
  </body>
`

document.body.appendChild(el)
```

### Node
Node doesn't have a DOM available. So in order to render HTML we use string
concatenation instead. This has the fun benefit of being quite efficient, which
in turn means it's great for server rendering!

```js
var html = require('nanohtml')

var el = html`
  <body>
    <h1>Hello planet</h1>
  </body>
`

console.log(el.toString())
```

### Node with custom DOM
Modules like [`jsdom`](https://github.com/jsdom/jsdom) implement (parts of)
the DOM in pure JavaScript. If you don't really need the performance of
string concatenation, or use nanohtml components that modify the raw DOM, use
`nanohtml/dom` to give nanohtml a custom Document.

```js
var JSDOM = require('jsdom').JSDOM
var nanohtml = require('nanohtml/dom')
var jsdom = new JSDOM()

var html = nanohtml(jsdom.window.document)
var el = html`
  <body>
    <h1>Hello planet</h1>
  </body>
`
el.appendChild(html`<p>A paragraph</p>`)

el.outerHTML === '<body><h1>Hello planet</h1><p>A paragraph</p></body>'
```

### Interpolating unescaped HTML
By default all content inside template strings is escaped. This is great for
strings, but not ideal if you want to insert HTML that's been returned from
another function (for example: a markdown renderer). Use `nanohtml/raw` for
to interpolate HTML directly.

```js
var raw = require('nanohtml/raw')
var html = require('nanohtml')

var string = '<h1>This a regular string.</h1>'
var el = html`
  <body>
    ${raw(string)}
  </body>
`

document.body.appendChild(el)
```

### Attaching event listeners
```js
var html = require('nanohtml')

var el = html`
  <body>
    <button onclick=${onclick}>
      Click Me
    </button>
  </body>
`

document.body.appendChild(el)

function onclick (e) {
  console.log(`${e.target} was clicked`)
}
```

### Multiple root elements

If you have more than one root element they will be combined with a [DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment).

```js
var html = require('nanohtml')

var el = html`
  <li>Chashu</li>
  <li>Nori</li>
`

document.querySelector('ul').appendChild(el)
```

## Static optimizations
Parsing HTML has significant overhead. Being able to parse HTML statically,
ahead of time can speed up rendering to be about twice as fast.

### Browserify

#### From the command line
```sh
$ browserify -t nanohtml index.js > bundle.js
```

#### Programmatically
```js
var browserify = require('browserify')
var nanohtml = require('nanohtml')
var path = require('path')

var b = browserify(path.join(__dirname, 'index.js'))
  .transform(nanohtml)

b.bundle().pipe(process.stdout)
```

#### In package.json
```json
{
  "name": "my-app",
  "private": true,
  "browserify": {
    "transform": [
      "nanohtml"
    ]
  },
  "dependencies": {
    "nanohtml": "^1.0.0"
  }
}
```

## Bundling

### Webpack
At the time of writing there's no Webpack loader yet. We'd love a contribution!

### Babel / Parcel

Add nanohtml to your `.babelrc` config.

Without options:

```js
{
  "plugins": [
    "nanohtml"
  ]
}
```

With options:

```js
{
  "plugins": [
    ["nanohtml", {
      "useImport": true
    }]
  ]
}
```

#### Options

 - `useImport` - Set to true to use `import` statements for injected modules.
    By default, `require` is used.
 - `appendChildModule` - Import path to a module that contains an `appendChild`
    function. Defaults to `"nanohtml/lib/append-child"`.

### Rollup

Use the [@rollup/plugin-commonjs](https://github.com/rollup/plugins/tree/master/packages/commonjs#using-with-rollupplugin-node-resolve) plugin with [@rollup/plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve). Explicitly import the browser or server entrypoint in your application. E.g.:

```
import html from 'nanohtml/lib/browser';
```

## Attributions
Shout out to [Shama](https://github.com/shama) and
[Shuhei](https://github.com/shuhei) for their contributions to
[Bel](https://github.com/shama/bel),
[yo-yoify](https://github.com/shama/yo-yoify) and
[pelo](https://github.com/shuhei/pelo). This module is based on their work, and
wouldn't have been possible otherwise!

## See Also
- [choojs/nanomorph](https://github.com/choojs/nanomorph)

## License
[MIT](./LICENSE)

[0]: https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square
[1]: https://nodejs.org/api/documentation.html#documentation_stability_index
[2]: https://img.shields.io/npm/v/nanohtml.svg?style=flat-square
[3]: https://npmjs.org/package/nanohtml
[4]: https://img.shields.io/travis/choojs/nanohtml/master.svg?style=flat-square
[5]: https://travis-ci.org/choojs/nanohtml
[6]: https://img.shields.io/codecov/c/github/choojs/nanohtml/master.svg?style=flat-square
[7]: https://codecov.io/github/choojs/nanohtml
[8]: http://img.shields.io/npm/dt/nanohtml.svg?style=flat-square
[9]: https://npmjs.org/package/nanohtml
[10]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[11]: https://github.com/feross/standard
