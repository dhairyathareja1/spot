import { describe, expect, it } from 'vitest'
import { expand, MAX_EXPANDED_STEPS } from '../engine/expand'
import { parse } from '../engine/parse'
import { resolve } from '../engine/resolve'

const theorem = 'theorem t : Solve start target := by'

function steps(source: string) {
  const parsed = parse(source)
  if (parsed.ok === false) throw new Error(parsed.error.message)
  const resolved = resolve(parsed.value)
  if (resolved.ok === false) throw new Error(resolved.error.message)
  return expand(resolved.value)
}

function moves(source: string) {
  const result = steps(source)
  if (result.ok === false) throw new Error(result.error.message)
  return result.value.map((step) => step.move)
}

describe('expand', () => {
  it('substitutes helper arguments and records call stacks and origins', () => {
    const result = steps([
      'def swapPair (a b : Nat) := by',
      '  swap a b',
      'def swapAndPaint (a b : Nat) (c : Color) := by',
      '  swapPair a b',
      '  paint a c',
      theorem,
      '  swapAndPaint 2 3 teal',
    ].join('\n'))

    expect(result).toEqual({
      ok: true,
      value: [
        { move: { kind: 'swap', a: 2, b: 3 }, line: 1, origin: 6, callStack: ['swapAndPaint 2 3 teal', 'swapPair 2 3'] },
        { move: { kind: 'paint', i: 2, color: 'teal' }, line: 4, origin: 6, callStack: ['swapAndPaint 2 3 teal'] },
      ],
    })
  })

  it('unrolls ranges, steps, lists and nested loops', () => {
    expect(moves(`${theorem}\n  for i in [0:6:2] do rotate i`)).toEqual([
      { kind: 'rotate', i: 0, dir: 'cw' },
      { kind: 'rotate', i: 2, dir: 'cw' },
      { kind: 'rotate', i: 4, dir: 'cw' },
    ])
    expect(moves(`${theorem}\n  for c in [teal, blue] do paint 1 c`)).toEqual([
      { kind: 'paint', i: 1, color: 'teal' },
      { kind: 'paint', i: 1, color: 'blue' },
    ])
    expect(moves(`${theorem}\n  for r in [0:2] do\n    for c in [0:2] do\n      rotate (r * 4 + c)`).map((move) => 'i' in move && move.i))
      .toEqual([0, 1, 4, 5])
  })

  it('labels loop iterations in the call stack', () => {
    const result = steps(`${theorem}\n  for i in [3:5] do rotate i`)

    expect(result.ok && result.value.map((step) => step.callStack)).toEqual([['i = 3'], ['i = 4']])
  })

  it('follows Lean Nat semantics for subtraction and division', () => {
    expect(moves(`${theorem}\n  rotate (2 - 5)\n  rotate (7 / 0)\n  rotate (7 / 2)\n  rotate (7 % 3)`).map((move) => 'i' in move && move.i))
      .toEqual([0, 0, 3, 1])
  })

  it('stops runaway expansion', () => {
    const result = steps(`${theorem}\n  for i in [0:99] do\n    for j in [0:99] do rotate 0`)

    expect(result).toMatchObject({ ok: false, error: { kind: 'limit', message: `proof expands to more than ${MAX_EXPANDED_STEPS} steps` } })
  })

  it('rejects a zero loop step', () => {
    expect(steps(`${theorem}\n  for i in [0:4:0] do rotate i`)).toMatchObject({
      ok: false,
      error: { kind: 'limit', line: 1, message: 'loop step must be greater than 0' },
    })
  })
})
