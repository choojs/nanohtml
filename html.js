import Partial from './partial'

export default function html (tmpl) {
  var values = Array.prototype.slice.call(arguments, 1)
  return new Partial(tmpl, values)
}
