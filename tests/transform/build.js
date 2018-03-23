const browserify = require('browserify')
const nanohtml = require('../../')

browserify(require.resolve('../browser'))
  .require('./lib/createElement', { expose: 'nanohtml/lib/createElement' })
  .transform('aliasify', {
    aliases: { '../../': 'nanohtml' }
  })
  .transform(nanohtml)
  .bundle()
  .pipe(process.stdout)
