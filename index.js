module.exports = typeof window !== 'undefined'
  ? require('./lib/browser')
  : require('./lib/server')
