const browserify = require('browserify')

const nanohtml = require('../../')

browserify(require.resolve('../browser'))
  .require('./lib/createElement.js', { expose: 'nanohtml/lib/createElement' })
  .transform('aliasify', {
    aliases: { '../../': 'nanohtml' }
  })
  .transform('babelify', {
    plugins: [
      nanohtml
    ]
  })
  .bundle()
  .pipe(process.stdout)
