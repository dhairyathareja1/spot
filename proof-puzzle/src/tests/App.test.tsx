import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders the level, boards, editor, and controls', () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain('Proof Puzzle')
    expect(markup).toContain('<h1>First Steps</h1>')
    expect(markup).toContain('>Target</h2>')
    expect(markup).toContain('Lean-style proof')
    expect(markup).toContain('Goal: 3 cells differ')
    expect(markup).toContain('Run</button>')
    expect(markup).toContain('Step</button>')
    expect(markup).toContain('Back</button>')
    expect(markup).toContain('Reset</button>')
  })
})
