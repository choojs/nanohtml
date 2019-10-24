function getNodeMajor () {
  return process.version.split('.')[0].slice(1)
}

if (typeof process === 'undefined' || getNodeMajor() >= 8) {
  require('./browser')
}

if (typeof window === 'undefined') {
  require('./server')
  require('./transform')
  require('./babel')
}
