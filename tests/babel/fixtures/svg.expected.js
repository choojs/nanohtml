var html = {
  'createElement': require('nanohtml/lib/createElement')
};


const svg = html.createElement('svg', {
  'viewBox': '0 14 32 18'
}, ['\n    ', html.createElement('path', {
  'd': 'M2 14 V18 H6 V14z'
}, []), '\n  ']);

const htmlAndSvg = html.createElement('div', {}, ['\n    ', html.createElement('svg', {
  'viewBox': '0 0 100 100'
}, ['\n      ', html.createElement('use', {
  'xlink:href': '#foo'
}, []), '\n    ']), '\n  ']);