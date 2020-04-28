var stack = []
var afterrender = stack.shift.bind(stack)

export default function choomemo () {
  var app = stack[0]
  return { state: app.state, emit: app.emit }
}

export function beforerender (app) {
  stack.unshift(app)
  return afterrender
}
