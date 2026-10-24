import { describe, expect, it } from 'vitest'
import { expand } from '../engine/expand'
import { parse } from '../engine/parse'
import { resolve } from '../engine/resolve'

function expandSource(source: string) {
  const parsed = parse(source)
  if (parsed.ok === false) return parsed
  const resolved = resolve(parsed.value)
  return resolved.ok ? expand(resolved.value) : resolved
}

describe('expand', () => {
  it('inlines nested helpers with body line numbers and call stacks', () => {
    const result = expandSource([
      'def swapPair (a : Nat) (b : Nat) := by',
      '  swap a b',
      'def swapAndPaint (a : Nat) (b : Nat) (c : Color) := by',
      '  swapPair a b',
      '  paint a c',
      'theorem level9 : Solve start target := by',
      '  swapAndPaint 0 1 teal',
    ].join('\n'))

    expect(result).toEqual({
      ok: true,
      value: [
        { move: { kind: 'swap', a: 0, b: 1 }, line: 1, callStack: ['swapAndPaint', 'swapPair'] },
        { move: { kind: 'paint', i: 0, color: 'teal' }, line: 4, callStack: ['swapAndPaint'] },
      ],
    })
  })

  it('allows call depth eight and rejects depth nine', () => {
    const definitions = ['def h0 := by', '  swap 0 1']
    for (let index = 1; index <= 7; index += 1) {
      definitions.push(`def h${index} := by`, `  h${index - 1}`)
    }
    const depthEight = expandSource([
      ...definitions,
      'theorem level6 : Solve start target := by',
      '  h7',
    ].join('\n'))
    expect(depthEight).toMatchObject({ ok: true, value: [{ callStack: ['h7', 'h6', 'h5', 'h4', 'h3', 'h2', 'h1', 'h0'] }] })

    definitions.push('def h8 := by', '  h7')
    const depthNine = expandSource([
      ...definitions,
      'theorem level6 : Solve start target := by',
      '  h8',
    ].join('\n'))
    expect(depthNine).toMatchObject({
      ok: false,
      error: { kind: 'limit', message: 'helper call depth exceeds 8' },
    })
  })

  it('rejects proofs with more than 200 expanded steps', () => {
    const statements = Array.from({ length: 201 }, () => '  swap 0 1')
    const result = expandSource([
      'theorem level6 : Solve start target := by',
      ...statements,
    ].join('\n'))

    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'limit', message: 'proof expands to more than 200 steps' },
    })
  })
})
