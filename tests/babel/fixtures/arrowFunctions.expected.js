var html = {
  'createElement': require('nanohtml/lib/createElement')
};


const component = () => html.createElement('div', {}, ['\n    ', html.createElement('h1', {}, [' hello world ']), '\n    ', list.map(x => html.createElement('span', {
  'style': 'background-color: red; margin: 10px;'
}, [' ', x, ' '])), '\n  ']); // https://github.com/goto-bus-stop/babel-plugin-yo-yoify/issues/14