import { describe, expect, it } from 'vitest'
import { applyMove, boardDistance } from '../engine/applyMove'
import { compile } from '../engine/compile'
import { parse } from '../engine/parse'
import { proofSize } from '../engine/proofSize'
import type { Board, Move } from '../engine/types'
import { levels } from '../levels/levels'

const basicSolutions: Record<number, Move[]> = {
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

const pairCalls = [0, 2, 4, 6]
const swapAndPaintCalls = pairCalls.map((index) => `  swapAndPaint ${index} ${index + 1} teal`)
const flatSwapAndPaint = pairCalls.flatMap((index) => [
  `  swap ${index} ${index + 1}`,
  `  paint ${index} teal`,
])

const helperSolutions: Record<number, string> = {
  6: [
    'def swapAndPaint (a : Nat) (b : Nat) (c : Color) := by',
    '  swap a b',
    '  paint a c',
    'theorem level6 : Solve start target := by',
    ...swapAndPaintCalls,
  ].join('\n'),
  7: [
    'def swapAndRotate (a : Nat) (b : Nat) := by',
    '  swap a b',
    '  rotate a',
    'theorem level7 : Solve start target := by',
    ...pairCalls.map((index) => `  swapAndRotate ${index} ${index + 1}`),
  ].join('\n'),
  8: [
    'def paintPair (a : Nat) (b : Nat) (c : Color) := by',
    '  paint a c',
    '  paint b c',
    'theorem level8 : Solve start target := by',
    '  paintPair 0 1 purple',
    '  paintPair 2 3 teal',
    '  paintPair 4 5 orange',
    '  paintPair 6 7 yellow',
  ].join('\n'),
  9: [
    'def swapPair (a : Nat) (b : Nat) := by',
    '  swap a b',
    'def swapAndPaint (a : Nat) (b : Nat) (c : Color) := by',
    '  swapPair a b',
    '  paint a c',
    'theorem level9 : Solve start target := by',
    ...swapAndPaintCalls,
  ].join('\n'),
  10: [
    'def swapAndPaint (a : Nat) (b : Nat) (c : Color) := by',
    '  swap a b',
    '  paint a c',
    'theorem level10 : Solve start target := by',
    ...swapAndPaintCalls,
  ].join('\n'),
}

const flatSolutions: Record<number, string> = {
  6: ['theorem level6 : Solve start target := by', ...flatSwapAndPaint].join('\n'),
  7: [
    'theorem level7 : Solve start target := by',
    ...pairCalls.flatMap((index) => [
      `  swap ${index} ${index + 1}`,
      `  rotate ${index}`,
    ]),
  ].join('\n'),
  8: [
    'theorem level8 : Solve start target := by',
    '  paint 0 purple', '  paint 1 purple',
    '  paint 2 teal', '  paint 3 teal',
    '  paint 4 orange', '  paint 5 orange',
    '  paint 6 yellow', '  paint 7 yellow',
  ].join('\n'),
  9: ['theorem level9 : Solve start target := by', ...flatSwapAndPaint].join('\n'),
  10: ['theorem level10 : Solve start target := by', ...flatSwapAndPaint].join('\n'),
}

const basicLevels = levels.filter((level) => level.id <= 5)
const helperLevels = levels.filter((level) => level.id >= 6)

describe('levels', () => {
  it.each(basicLevels)('level $id solves with its intended moves', (level) => {
    let currentBoard: Board = level.start

    for (const move of basicSolutions[level.id]) {
      const result = applyMove(currentBoard, move)
      expect(result.ok).toBe(true)
      if (result.ok) currentBoard = result.value
    }

    expect(boardDistance(currentBoard, level.target)).toBe(0)
  })

  it.each(helperLevels)('level $id solves with its reusable helper proof', (level) => {
    const result = compile(level, helperSolutions[level.id])

    expect(result).toHaveProperty('trace')
    if ('trace' in result) {
      expect(result.trace.solved).toBe(true)
      expect(result.trace.steps).toHaveLength(level.par)
    }
  })

  it.each(helperLevels)('level $id rejects its flat proof at the line limit', (level) => {
    const result = compile(level, flatSolutions[level.id])

    expect(result).toEqual({
      diagnostic: {
        kind: 'limit',
        line: expect.any(Number),
        message: `proof is 8 lines, this level allows at most ${level.maxLines}`,
      },
    })
  })

  it('counts statements in helper bodies and the theorem body', () => {
    const parsed = parse(helperSolutions[9])

    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(proofSize(parsed.value)).toBe(7)
  })
})
