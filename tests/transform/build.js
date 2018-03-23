const browserify = require('browserify')
const pathmodify = require('pathmodify')
const nanohtml = require('../../')

browserify(require.resolve('../browser'))
  .transform('aliasify', {
    aliases: { '../../': 'nanohtml' }
  })
  .transform(nanohtml)
  .plugin(pathmodify, {
    mods: [
      pathmodify.mod.dir('nanohtml', '../../')
    ]
  })
  .bundle()
  .pipe(process.stdout)
