var html = {
  'createElement': require('nanohtml/lib/createElement')
};


html.createElement('input', {
  'autofocus': 'autofocus'
}, []);
html.createElement('input', {
  'checked': true
}, []);
html.createElement('button', {
  'disabled': someVariable
}, []);