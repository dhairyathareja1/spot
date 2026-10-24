import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders the Proof Puzzle heading', () => {
    expect(renderToStaticMarkup(<App />)).toBe('<h1>Proof Puzzle</h1>')
  })
})
