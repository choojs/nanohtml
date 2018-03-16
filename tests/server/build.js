const browserify = require('browserify')

browserify(require.resolve('../browser'))
  .transform('aliasify', {
    aliases: { '../../': require.resolve('./browser') }
  })
  .bundle()
  .pipe(process.stdout)
