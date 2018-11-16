const test = require('tape')
const path = require('path')
const fs = require('fs')
const babel = require('babel-core')
const pify = require('pify')
const nanohtml = require('../../')

const transformFixture = pify(babel.transformFile)
const readExpected = pify(fs.readFile)
const writeActual = pify(fs.writeFile)

function testFixture (name, opts) {
  test(name, (t) => {
    t.plan(1)

    const actualPromise = transformFixture(path.join(__dirname, 'fixtures', `${name}.js`), {
      plugins: [
        [nanohtml, opts || {}]
      ]
    })
    const expectedPromise = readExpected(path.join(__dirname, 'fixtures', `${name}.expected.js`), 'utf8')

    Promise.all([ actualPromise, expectedPromise ])
      .then((results) => {
        const actual = results[0].code.trim()
        const expected = results[1].trim()

        t.equal(actual, expected)

        return writeActual(path.join(__dirname, 'fixtures', `${name}.actual.js`), results[0].code)
      })
      .catch((err) => {
        t.fail(err.message)
      })
      .then(() => t.end())
  })
}

testFixture('simple')
testFixture('custom-build-in')
testFixture('empty')
testFixture('this')
testFixture('variableNames')
testFixture('nesting')
testFixture('elementsChildren')
testFixture('combinedAttr')
testFixture('booleanAttr')
testFixture('dynamicAttr')
testFixture('events')
testFixture('orderOfOperations')
testFixture('svg')
testFixture('require')
testFixture('yoyoBindings')
testFixture('arrowFunctions')
testFixture('hyperx')
testFixture('comment')
testFixture('useImport', { useImport: true })
