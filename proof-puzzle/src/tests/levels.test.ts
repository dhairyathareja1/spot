import { describe, expect, it } from 'vitest'
import { applyMove, boardDistance } from '../engine/applyMove'
import type { Board, Move } from '../engine/types'
import { levels } from '../levels/levels'

const solutions: Record<number, Move[]> = {
  1: [
    { kind: 'swap', a: 0, b: 1 },
    { kind: 'paint', i: 2, color: 'purple' },
  ],
  2: [
    { kind: 'rotate', i: 0, dir: 'cw' },
    { kind: 'paint', i: 1, color: 'teal' },
  ],
  3: [
    { kind: 'swap', a: 0, b: 3 },
    { kind: 'swap', a: 1, b: 2 },
  ],
  4: [
    { kind: 'swap', a: 0, b: 2 },
    { kind: 'paint', i: 3, color: 'orange' },
  ],
  5: [
    { kind: 'swap', a: 0, b: 3 },
    { kind: 'paint', i: 1, color: 'orange' },
    { kind: 'rotate', i: 2, dir: 'cw' },
  ],
}

describe('levels', () => {
  it.each(levels)('level $id solves with its intended moves', (level) => {
    let currentBoard: Board = level.start

    for (const move of solutions[level.id]) {
      const result = applyMove(currentBoard, move)
      expect(result.ok).toBe(true)
      if (result.ok) currentBoard = result.value
    }

    expect(boardDistance(currentBoard, level.target)).toBe(0)
  })
})
