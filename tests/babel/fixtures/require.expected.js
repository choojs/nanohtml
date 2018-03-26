var html = {
  'createElement': require('nanohtml/lib/createElement')
},
    yoyo = {
  'createElement': require('yo-yo/lib/createElement')
};


const a = html.createElement('a', {
  'id': 'test'
}, []);
const b = yoyo.createElement('b', {
  'id': 'test'
}, []);
const c = require('choo/html').createElement('c', {
  'id': 'test'
}, []);