var _pageHeader,
    _datePicker,
    _footer,
    _appendChild = require('nanohtml/lib/append-child');

_pageHeader = document.createElement('h1'), _pageHeader.setAttribute('id', 'page-header'), _pageHeader;
_datePicker = document.createElement('span'), _datePicker.setAttribute('class', 'date-picker'), _datePicker;
_footer = document.createElement('footer'), _appendChild(_footer, ['\n']), _footer;