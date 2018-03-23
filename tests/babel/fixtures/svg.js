import html from 'nanohtml'

const svg = html`
  <svg viewBox="0 14 32 18">
    <path d="M2 14 V18 H6 V14z" />
  </svg>
`

const htmlAndSvg = html`
  <div>
    <svg />
  </div>
`
