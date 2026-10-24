import { describe, expect, it } from 'vitest'
import { compile } from '../engine/compile'
import { levels } from '../levels/levels'

const level = levels[0]
const theorem = 'theorem level1 : Solve start target := by'

describe('compile', () => {
  it('solves level 1 from proof text', () => {
    const result = compile(level, `${theorem}\n  swap 0 1\n  paint 2 purple`)

    expect(result).toHaveProperty('trace')
    if ('trace' in result) expect(result.trace.solved).toBe(true)
  })

  it('reports an illegal move with its source line and error code', () => {
    const result = compile(level, `${theorem}\n\n  swap 0 9`)

    expect(result).toHaveProperty('trace')
    if ('trace' in result) {
      expect(result.trace.solved).toBe(false)
      expect(result.trace.failedAt).toEqual({
        stepIndex: 0,
        diagnostic: {
          kind: 'move',
          line: 2,
          message: 'OUT_OF_BOUNDS',
          error: { code: 'OUT_OF_BOUNDS', indices: [9] },
        },
      })
    }
  })

  it('returns parser diagnostics for unknown colors, wrong arity, and a missing theorem', () => {
    expect(compile(level, `${theorem}\n  paint 2 cyan`)).toEqual({
      diagnostic: { kind: 'name', line: 1, message: 'unknown color: cyan' },
    })
    expect(compile(level, `${theorem}\n  swap 0`)).toEqual({
      diagnostic: { kind: 'arity', line: 1, message: 'usage: swap <i> <j>' },
    })
    expect(compile(level, 'swap 0 1')).toEqual({
      diagnostic: { kind: 'parse', line: 0, message: 'expected theorem declaration ending with := by' },
    })
  })

  it('leaves a proof with sorry incomplete without reporting a failure', () => {
    const result = compile(level, `${theorem}\n  swap 0 1\n  paint 2 purple\n  sorry`)

    expect(result).toHaveProperty('trace')
    if ('trace' in result) {
      expect(result.trace.solved).toBe(false)
      expect(result.trace.distance).toEqual([3, 1, 0])
      expect(result.trace.failedAt).toBeUndefined()
    }
  })
})
