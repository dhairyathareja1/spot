import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { levels } from '../levels/levels'
import { PlayScreen } from '../ui/PlayScreen'
import { puzzleForRoute } from '../ui/puzzles'
import { emptyProgress } from '../ui/storage'

describe('App', () => {
  it('renders the home screen with every chapter and level', () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain('Proof Puzzle')
    expect(markup).toContain('Moves')
    expect(markup).toContain('Helpers')
    expect(markup).toContain('Loops')
    for (const level of levels) expect(markup).toContain(level.title)
  })

  it('renders a level with its board, target, editor and infoview', () => {
    const puzzle = puzzleForRoute({ screen: 'level', id: 1 })!
    const markup = renderToStaticMarkup(<PlayScreen puzzle={puzzle} progress={emptyProgress()} onProgress={() => undefined} />)

    expect(markup).toContain('First Steps')
    expect(markup).toContain('>Target</h2>')
    expect(markup).toContain('level1.lean')
    expect(markup).toContain('1 goal')
    expect(markup).toContain('board = target')
    expect(markup).toContain('3 blocks to fix')
    expect(markup).toContain('proof is not finished (it uses sorry)')
  })

  it('builds daily, random and invalid custom puzzles', () => {
    expect(puzzleForRoute({ screen: 'daily' })?.kind).toBe('daily')
    expect(puzzleForRoute({ screen: 'random', difficulty: 'easy', seed: 'abc' })?.level.par).toBeGreaterThan(0)
    expect(puzzleForRoute({ screen: 'custom', data: 'garbage' })).toBeUndefined()
  })
})
