# nanohtml
[![npm version][2]][3] [![build status][4]][5]
[![downloads][8]][9] [![js-standard-style][10]][11]

HTML template string rendering for Node & Browsers.

## Installation
```sh
$ npm install nanohtml
```

## Usage
```js
var html = require('nanohtml')

var el = html`
  <body>
    <h1>Hello planet</h1>
  </body>
`

document.body.appendChild(el)
```

## Node
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

## Interpolating unescaped HTML
By default all content inside template strings is escaped. This is great for
strings, but not ideal if you want to insert HTML that's been returned from
another function (for example: a markdown renderer). Use `nanohtml/raw` for
to interpolate HTML directly.

```js
var raw = require('nanohtml/raw')
var html = require('nanohtml')

var string = '<h1>This a regular string.'
var el = html`
  <body>
    ${raw(string)}
  </body>
`

document.body.appendChild(el)
```

## Static optimizations
Parsing HTML has significant overhead. Being able to parse HTML statically,
ahead of time can speed up rendering by about 2x.

### Browserify
```sh
$ browserify -t nanohtml index.js > bundle.js
```

### Webpack
At the time of writing there's no Webpack loader yet. We'd love a contribution!

### Parcel
At the time of writing there's no Parcel plugin yet. We'd love a contribution!

## Attributions
Shout out to [Shama](https://github.com/shama) and
[Shuhei](https://github.com/shuhei) for their contributions to
[Bel](https://github.com/shama/html),
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
[8]: http://img.shields.io/npm/dm/nanohtml.svg?style=flat-square
[9]: https://npmjs.org/package/nanohtml
[10]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[11]: https://github.com/feross/standard
