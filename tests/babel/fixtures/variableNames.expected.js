var html = {
  'createElement': require('nanohtml/lib/createElement')
};


html.createElement('h1', {
  'id': 'page-header'
}, []);
html.createElement('span', {
  'class': 'date-picker'
}, []);
html.createElement('footer', {}, ['\n']);