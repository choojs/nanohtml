if (typeof window !== 'undefined') {
  require('./browser')
} else {
  require('./server')
  require('./transform')
}
