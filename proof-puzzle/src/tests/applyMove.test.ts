import { describe, expect, it } from 'vitest'
import { applyMove, boardDistance } from '../engine/applyMove'
import type { Board, Block, Move } from '../engine/types'

function block(overrides: Partial<Block> = {}): Block {
  return {
    color: 'blue',
    rot: 0,
    locked: false,
    canRotate: true,
    pinned: false,
    ...overrides,
  }
}

function board(cells: readonly Block[]): Board {
  return { rows: 1, cols: cells.length, cells }
}

describe('applyMove', () => {
  it('swaps whole blocks and returns a new board', () => {
    const first = block({ color: 'blue', rot: 1, locked: true })
    const second = block({ color: 'green', rot: 3, canRotate: false, pinned: false })
    const input = board([first, second])

    const result = applyMove(input, { kind: 'swap', a: 0, b: 1 })

    expect(result).toEqual({ ok: true, value: { ...input, cells: [second, first] } })
    expect(result.ok && result.value).not.toBe(input)
    expect(result.ok && result.value.cells).not.toBe(input.cells)
  })

  it('paints a block while preserving its other properties', () => {
    const input = board([block({ rot: 2, canRotate: false })])

    const result = applyMove(input, { kind: 'paint', i: 0, color: 'purple' })

    expect(result).toEqual({
      ok: true,
      value: board([block({ color: 'purple', rot: 2, canRotate: false })]),
    })
  })

  it.each([
    ['cw', 0, 1],
    ['cw', 3, 0],
    ['ccw', 0, 3],
    ['ccw', 2, 1],
  ] as const)('rotates %s from %i to %i', (dir, start, expected) => {
    const input = board([block({ rot: start })])

    const result = applyMove(input, { kind: 'rotate', i: 0, dir })

    expect(result).toEqual({
      ok: true,
      value: board([block({ rot: expected })]),
    })
  })

  it.each([
    [
      { kind: 'swap', a: 0, b: 3 },
      { code: 'OUT_OF_BOUNDS', indices: [3] },
    ],
    [
      { kind: 'paint', i: 3, color: 'teal' },
      { code: 'OUT_OF_BOUNDS', indices: [3] },
    ],
    [
      { kind: 'rotate', i: 3, dir: 'cw' },
      { code: 'OUT_OF_BOUNDS', indices: [3] },
    ],
    [
      { kind: 'swap', a: 0, b: 0 },
      { code: 'SWAP_SAME', indices: [0] },
    ],
    [
      { kind: 'swap', a: 0, b: 1 },
      { code: 'PINNED', indices: [1] },
    ],
    [
      { kind: 'paint', i: 1, color: 'green' },
      { code: 'LOCKED', indices: [1] },
    ],
    [
      { kind: 'rotate', i: 1, dir: 'cw' },
      { code: 'LOCKED', indices: [1] },
    ],
    [
      { kind: 'rotate', i: 2, dir: 'cw' },
      { code: 'NOT_ROTATABLE', indices: [2] },
    ],
    [
      { kind: 'paint', i: 0, color: 'blue' },
      { code: 'ALREADY_COLOR', indices: [0] },
    ],
  ] as const)('returns %s for an invalid move', (move, error) => {
    const input = board([
      block(),
      block({ pinned: true, locked: true }),
      block({ canRotate: false }),
    ])

    expect(applyMove(input, move as Move)).toEqual({ ok: false, error })
  })

  it('does not mutate a frozen board for successful moves', () => {
    const input = Object.freeze({
      rows: 1,
      cols: 3,
      cells: Object.freeze([
        Object.freeze(block()),
        Object.freeze(block({ color: 'green', rot: 1 })),
        Object.freeze(block({ color: 'yellow', rot: 2 })),
      ]),
    })
    const before = JSON.stringify(input)
    const moves: Move[] = [
      { kind: 'swap', a: 0, b: 1 },
      { kind: 'paint', i: 0, color: 'purple' },
      { kind: 'rotate', i: 2, dir: 'ccw' },
    ]

    for (const move of moves) {
      expect(applyMove(input, move).ok).toBe(true)
    }

    expect(JSON.stringify(input)).toBe(before)
  })
})

describe('boardDistance', () => {
  it('counts cells whose color or rotation differs once', () => {
    const start = board([
      block({ color: 'blue' }),
      block({ color: 'green', rot: 0 }),
      block({ color: 'yellow', rot: 0, locked: true }),
    ])
    const target = board([
      block({ color: 'purple' }),
      block({ color: 'green', rot: 1 }),
      block({ color: 'yellow', rot: 2 }),
    ])

    expect(boardDistance(start, target)).toBe(3)
    expect(boardDistance(start, start)).toBe(0)
  })

  it('counts unmatched cells when board lengths differ', () => {
    expect(boardDistance(board([block()]), board([block(), block({ color: 'teal' })]))).toBe(1)
  })
})
