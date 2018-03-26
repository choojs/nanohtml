const browserify = require('browserify')

const nanohtml = require('../../')

browserify(require.resolve('../browser'))
  .require('./lib/createElement.js', { expose: 'nanohtml/lib/createElement' })
  .transform('aliasify', {
    aliases: { '../../': 'nanohtml' }
  })
  .transform('babelify', {
    plugins: [
      [nanohtml, {
        // Explicitly set these, because `nanohtml` can't be resolved
        appendChildModule: require.resolve('../../lib/append-child'),
        setAttributeModule: require.resolve('../../lib/set-attribute')
      }]
    ]
  })
  .bundle()
  .pipe(process.stdout)
