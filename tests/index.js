require('./browser')
if (typeof window === 'undefined') {
  require('./server')
  require('./transform')
  require('./babel')
}
