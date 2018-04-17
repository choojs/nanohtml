var html = {
  'createElement': require('nanohtml/lib/createElement')
};


html.createElement('button', {
  'onclick': event => {
    console.log(event);
  }
}, ['\n']);