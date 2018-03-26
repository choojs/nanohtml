var html = {
  'createElement': require('nanohtml/lib/createElement')
};


let i = 0;

const counter = html.createElement('div', {}, ['\n    ', i++, '\n    ', html.createElement('p', {}, [i++]), '\n    ', i++, '\n  ']);