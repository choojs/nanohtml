var html = {
  'createElement': require('yo-yo/lib/createElement')
};


html.createElement('div', {}, ['\n    ', html.createElement('!--', {
  'comment': ' important comment text '
}, []), '\n  ']);