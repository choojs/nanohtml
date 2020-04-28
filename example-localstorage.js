import { html, Component, memo, onupdate } from 'nanohtml'

var Form = Component(function (fields, values = memo(getInitialValues)) {
  var update = onupdate(function (fields, values) {
    if (values) {
      for (const [key, value] of Object.entries(values)) {
        window.localStorage.set(key, value)
      }
    }
  })

  return html`
    <form>
      ${fields.map((attrs) => html`
        <input ${attrs} value="${values[attrs.name]}" oninput=${(event) => update(fields, { ...values, [attrs.name]: event.target.value })}>
      `)}
    </form>
  `
})

function getInitialValues (fields) {
  return fields.reduce(function (acc, attrs) {
    acc[attrs.name] = attrs.value || window.localStorage.get(attrs.name) || ''
    return acc
  }, {})
}

html`
  <body>
    ${Form([
      { type: 'text', name: 'firstname' },
      { type: 'text', name: 'lastname' }
    ])}
  </body>
`
