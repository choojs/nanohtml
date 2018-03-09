const browserify = require('browserify')
const nanohtmlify = require('../../lib/babel')

browserify(require.resolve('../browser'))
  .transform('aliasify', {
    aliases: { '../../': 'nanohtml' }
  })
  .transform('babelify', {
    plugins: [
      [nanohtmlify, {
        // Explicitly set these, because `nanohtml` can't be resolved
        appendChildModule: require.resolve('../../lib/append-child'),
        setAttributeModule: require.resolve('../../lib/set-attribute')
      }]
    ]
  })
  .bundle()
  .pipe(process.stdout)
