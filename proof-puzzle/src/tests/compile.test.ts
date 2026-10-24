import { describe, expect, it } from 'vitest'
import { compile, isCompileSuccess } from '../engine/compile'
import { findLevel, levels } from '../levels/levels'

const level = levels[0]
const theorem = 'theorem level1 : Solve start target := by'

describe('compile', () => {
  it('solves level 1 from proof text and reports its size', () => {
    const result = compile(level, `${theorem}\n  swap 0 1\n  paint 2 purple`)

    expect(isCompileSuccess(result) && result.trace.solved).toBe(true)
    expect(isCompileSuccess(result) && result.size).toBe(2)
  })

  it('reports an illegal move with its source line and error code', () => {
    const result = compile(level, `${theorem}\n\n  swap 0 9`)

    expect(isCompileSuccess(result) && result.trace.failedAt).toEqual({
      stepIndex: 0,
      diagnostic: { kind: 'move', line: 2, message: 'OUT_OF_BOUNDS', error: { code: 'OUT_OF_BOUNDS', indices: [9] } },
    })
  })

  it('returns diagnostics for unknown colors, wrong arity and a missing theorem', () => {
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

  it("leaves a proof with sorry incomplete and warns like Lean", () => {
    const result = compile(level, `${theorem}\n  swap 0 1\n  paint 2 purple\n  sorry`)

    expect(isCompileSuccess(result)).toBe(true)
    if (isCompileSuccess(result)) {
      expect(result.trace.solved).toBe(false)
      expect(result.usesSorry).toBe(true)
      expect(result.warnings).toContainEqual({ line: 0, message: "declaration uses 'sorry'" })
    }
  })

  it('rejects helpers and loops on levels that do not allow them', () => {
    expect(compile(level, `def f := by\n  swap 0 1\n${theorem}\n  f`)).toEqual({
      diagnostic: { kind: 'level', line: 0, message: 'helper definitions are not allowed on this level' },
    })
    expect(compile(findLevel(10)!, 'theorem t : Solve start target := by\n  for i in [0:2] do rotate i')).toEqual({
      diagnostic: { kind: 'level', line: 1, message: 'for loops are not allowed on this level' },
    })
  })

  it('enforces the line limit, counting loop headers and helper bodies', () => {
    const result = compile(findLevel(16)!, 'theorem t : Solve start target := by\n  for i in [0:4] do\n    paint i teal\n    rotate i')

    expect(result).toMatchObject({
      diagnostic: { kind: 'limit', line: 3, message: 'proof is 3 lines, this level allows at most 2' },
    })
  })
})
