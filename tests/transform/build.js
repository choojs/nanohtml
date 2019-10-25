const browserify = require('browserify')
const nanohtml = require('../../')

browserify(require.resolve('../browser'))
  .transform('aliasify', {
    aliases: {
      './html': 'nanohtml',
      '../../': 'nanohtml'
    }
  })
  .transform(nanohtml)
  .bundle()
  .pipe(process.stdout)
