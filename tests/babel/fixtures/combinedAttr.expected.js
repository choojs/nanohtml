var html = {
  'createElement': require('nanohtml/lib/createElement')
};


html.createElement('div', {
  'id': 'a' + 1 + ' b' + 2
}, ['\n']);