import { describe, expect, it } from 'vitest'
import { parse } from '../engine/parse'

describe('parse', () => {
  it('parses moves and keeps zero-based source line numbers', () => {
    const result = parse(`-- level note

theorem level1 : Solve start target := by
  swap 0 1 -- swap the first two blocks
paint 2 purple
rotate 3 ccw`)

    expect(result).toEqual({
      ok: true,
      value: [
        { move: { kind: 'swap', a: 0, b: 1 }, line: 3, callStack: [] },
        { move: { kind: 'paint', i: 2, color: 'purple' }, line: 4, callStack: [] },
        { move: { kind: 'rotate', i: 3, dir: 'ccw' }, line: 5, callStack: [] },
      ],
    })
  })

  it('stops at sorry and ignores subsequent lines', () => {
    const result = parse(`theorem level1 : Solve start target := by
  swap 0 1
  sorry
  unknown tactic`)

    expect(result).toEqual({
      ok: true,
      value: [{ move: { kind: 'swap', a: 0, b: 1 }, line: 1, callStack: [] }],
    })
  })

  it('returns a name diagnostic for an unknown color', () => {
    const result = parse(`theorem level1 : Solve start target := by
  paint 2 cyan`)

    expect(result).toEqual({
      ok: false,
      error: { kind: 'name', line: 1, message: 'unknown color: cyan' },
    })
  })

  it('returns an arity diagnostic for malformed arguments', () => {
    const result = parse(`theorem level1 : Solve start target := by
  swap 0`)

    expect(result).toEqual({
      ok: false,
      error: { kind: 'arity', line: 1, message: 'usage: swap <i> <j>' },
    })
  })

  it('requires a theorem declaration as the first non-blank line', () => {
    const result = parse('\n-- comment\nswap 0 1')

    expect(result).toEqual({
      ok: false,
      error: { kind: 'parse', line: 2, message: 'expected theorem declaration ending with := by' },
    })
  })
})
