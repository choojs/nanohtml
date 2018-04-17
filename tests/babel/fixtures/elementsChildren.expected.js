var html = {
  'createElement': require('nanohtml/lib/createElement')
};


const child = html.createElement('h1', {}, ['Page header']);

const header = html.createElement('header', {}, [child]);