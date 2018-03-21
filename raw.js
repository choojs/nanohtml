module.exports = typeof window !== 'undefined'
  ? require('./lib/raw-browser')
  : require('./lib/raw-server')
