var html = {
  'createElement': require('choo/html/lib/createElement')
};


var element;
if (someCondition) {
  element = html.createElement('h1', {}, ['Warning!']);
}
document.body.appendChild(someCondition);