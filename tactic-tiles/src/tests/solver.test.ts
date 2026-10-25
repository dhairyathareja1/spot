import { describe, expect, it } from 'vitest'
import { applyMove, boardDistance } from '../engine/applyMove'
import { grid, toGrid } from '../engine/board'
import { generatePuzzle } from '../engine/random'
import { formatMove, solveGreedy, suggestMove } from '../engine/solver'
import { levels } from '../levels/levels'

describe('solver', () => {
  it('prefers a swap that fixes two cells at once', () => {
    expect(suggestMove(grid(['b g y']), grid(['g b y']))).toEqual({ kind: 'swap', a: 0, b: 1 })
  })

  it('paints or rotates in place when no swap helps', () => {
    expect(suggestMove(grid(['b g']), grid(['b t']))).toEqual({ kind: 'paint', i: 1, color: 'teal' })
    expect(suggestMove(grid(['b<']), grid(['b^']))).toEqual({ kind: 'rotate', i: 0, dir: 'cw' })
    expect(suggestMove(grid(['b>']), grid(['b^']))).toEqual({ kind: 'rotate', i: 0, dir: 'ccw' })
  })

  it('never swaps pinned blocks', () => {
    expect(suggestMove(grid(['b! g']), grid(['g b']))).toEqual({ kind: 'paint', i: 0, color: 'green' })
  })

  it.each(levels)('solves level $id from scratch', (level) => {
    const moves = solveGreedy(level.start, level.target)

    expect(moves).toBeDefined()
    let board = level.start
    for (const move of moves!) {
      const next = applyMove(board, move)
      expect(next.ok).toBe(true)
      if (next.ok) board = next.value
    }
    expect(boardDistance(board, level.target)).toBe(0)
  })

  it('formats moves as proof lines', () => {
    expect(formatMove({ kind: 'rotate', i: 3, dir: 'ccw' })).toBe('rotate 3 ccw')
    expect(formatMove({ kind: 'paint', i: 1, color: 'teal' })).toBe('paint 1 teal')
  })
})

describe('generatePuzzle', () => {
  it('is deterministic for a seed', () => {
    const a = generatePuzzle('2026-10-25', 'medium')
    const b = generatePuzzle('2026-10-25', 'medium')
    expect(toGrid(a.target)).toEqual(toGrid(b.target))
  })

  it.each(['easy', 'medium', 'hard'] as const)('creates solvable %s puzzles', (difficulty) => {
    for (let seed = 0; seed < 20; seed += 1) {
      const puzzle = generatePuzzle(`seed-${seed}`, difficulty)
      expect(boardDistance(puzzle.start, puzzle.target)).toBeGreaterThan(0)
      expect(puzzle.par).toBeGreaterThan(0)
      expect(puzzle.par).toBeLessThanOrEqual(puzzle.scramble.length)
    }
  })
})

describe('grid notation', () => {
  it('round-trips colors, facings and flags', () => {
    const rows = ['b> g*! y#', 'p o t<']
    expect(toGrid(grid(rows))).toEqual(rows)
  })
})
