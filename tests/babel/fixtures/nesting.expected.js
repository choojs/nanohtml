var html = {
  'createElement': require('nanohtml/lib/createElement')
};


html.createElement('div', {
  'class': 'a'
}, ['\n    ', html.createElement('div', {
  'class': 'b'
}, ['\n  ']), '\n']);