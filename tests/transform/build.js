const browserify = require('browserify')
const nanohtml = require('../../')

browserify(require.resolve('../browser'))
  .transform('aliasify', {
    aliases: { '../../': 'nanohtml' }
  })
  .transform(nanohtml)
  .bundle()
  .pipe(process.stdout)
