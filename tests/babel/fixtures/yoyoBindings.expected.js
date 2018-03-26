var yo = {
  'createElement': require('yo-yo/lib/createElement')
},
    html = {
  'createElement': require('nanohtml/lib/createElement')
},
    unrelated = {
  'createElement': require('choo/html/lib/createElement')
};

const notYoYo = require('not-yo-yo');


// Require() call
yo.createElement('a', {}, []);
// Should not be converted
notYoYo`<hello world />`;
// import with a standard `html` name
html.createElement('b', {}, []);
// import with a completely different name
unrelated.createElement('c', {}, []);