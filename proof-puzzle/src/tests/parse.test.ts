import { describe, expect, it } from 'vitest'
import { parse } from '../engine/parse'

const theorem = 'theorem level1 : Solve start target := by'

describe('parse', () => {
  it('parses tactics with zero-based source lines and ignores comments', () => {
    const source = [
      '-- level note',
      '',
      theorem,
      '  swap 0 1 -- swap the first two blocks',
      'paint 2 purple',
      '  /- block comment -/ rotate 3 ccw',
    ].join('\n')

    expect(parse(source)).toEqual({
      ok: true,
      value: {
        helpers: [],
        theorem: { name: 'level1', line: 2 },
        body: [
          { kind: 'tactic', name: 'swap', args: [{ kind: 'nat', value: 0 }, { kind: 'nat', value: 1 }], line: 3 },
          { kind: 'tactic', name: 'paint', args: [{ kind: 'nat', value: 2 }, { kind: 'color', value: 'purple' }], line: 4 },
          { kind: 'tactic', name: 'rotate', args: [{ kind: 'nat', value: 3 }, { kind: 'var', name: 'ccw' }], line: 5 },
        ],
      },
    })
  })

  it('parses grouped and separate typed binders', () => {
    const result = parse([
      'def swapAndPaint (a b : Nat) (c : Color) := by',
      '  swap a b',
      '  paint a c',
      theorem,
      '  swapAndPaint 0 1 teal',
    ].join('\n'))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.helpers[0].parameters).toEqual([
        { name: 'a', type: 'Nat' },
        { name: 'b', type: 'Nat' },
        { name: 'c', type: 'Color' },
      ])
      expect(result.value.helpers[0].body).toHaveLength(2)
      expect(result.value.body[0]).toMatchObject({ kind: 'tactic', name: 'swapAndPaint', line: 4 })
    }
  })

  it('parses arithmetic with precedence inside parentheses', () => {
    const result = parse(`${theorem}\n  swap i (r * 4 + c % 2)`)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.body[0]).toEqual({
        kind: 'tactic',
        name: 'swap',
        args: [
          { kind: 'var', name: 'i' },
          {
            kind: 'binop',
            op: '+',
            left: { kind: 'binop', op: '*', left: { kind: 'var', name: 'r' }, right: { kind: 'nat', value: 4 } },
            right: { kind: 'binop', op: '%', left: { kind: 'var', name: 'c' }, right: { kind: 'nat', value: 2 } },
          },
        ],
        line: 1,
      })
    }
  })

  it('asks for parentheses around bare arithmetic', () => {
    expect(parse(`${theorem}\n  swap i i + 1`)).toEqual({
      ok: false,
      error: { kind: 'parse', line: 1, message: 'wrap arithmetic in parentheses, e.g. swap i (i + 1)' },
    })
  })

  it('parses inline and indented for loops, ranges, steps and lists', () => {
    const result = parse([
      theorem,
      '  for i in [0:8:2] do rotate i',
      '  for r in [:2] do',
      '    for c in [1, 3] do',
      '      paint (r * 4 + c) teal',
      '  swap 0 1',
    ].join('\n'))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [first, second, third] = result.value.body
    expect(first).toMatchObject({
      kind: 'for',
      variable: 'i',
      source: { kind: 'range', start: { value: 0 }, stop: { value: 8 }, step: { value: 2 } },
      body: [{ kind: 'tactic', name: 'rotate', line: 1 }],
    })
    expect(second).toMatchObject({
      kind: 'for',
      variable: 'r',
      source: { kind: 'range', start: { value: 0 }, stop: { value: 2 } },
      body: [{ kind: 'for', variable: 'c', source: { kind: 'list' }, body: [{ name: 'paint', line: 4 }] }],
    })
    expect(third).toMatchObject({ kind: 'tactic', name: 'swap', line: 5 })
  })

  it('requires an indented body after a bare do', () => {
    expect(parse(`${theorem}\n  for i in [0:3] do\n  swap 0 1`)).toEqual({
      ok: false,
      error: { kind: 'parse', line: 1, message: 'expected an indented loop body after do' },
    })
  })

  it('accepts a proof on the same line as := by and example declarations', () => {
    const result = parse('example : Solve start target := by swap 0 1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.theorem).toEqual({ name: 'example', line: 0 })
      expect(result.value.body).toHaveLength(1)
    }
  })

  it('stops a block at sorry and ignores the lines after it', () => {
    const result = parse(`${theorem}\n  swap 0 1\n  sorry\n  this is not parsed`)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.body.map((statement) => statement.kind)).toEqual(['tactic', 'sorry'])
  })

  it('reports a missing theorem, misplaced helpers and duplicate theorems', () => {
    expect(parse('swap 0 1')).toEqual({
      ok: false,
      error: { kind: 'parse', line: 0, message: 'expected theorem declaration ending with := by' },
    })
    expect(parse(`${theorem}\n  swap 0 1\ndef late := by\n  swap 0 1`)).toMatchObject({
      ok: false,
      error: { line: 2, message: 'helper definitions must appear before the theorem' },
    })
    expect(parse(`${theorem}\n${theorem}`)).toMatchObject({
      ok: false,
      error: { line: 1, message: 'only one theorem declaration is allowed' },
    })
  })

  it('rejects untyped, duplicate and reserved helper parameters', () => {
    expect(parse(`def bad (a) := by\n  swap a 1\n${theorem}`)).toMatchObject({
      error: { kind: 'parse', line: 0 },
    })
    expect(parse(`def bad (a a : Nat) := by\n  swap a 1\n${theorem}`)).toMatchObject({
      error: { kind: 'name', message: 'duplicate parameter: a' },
    })
    expect(parse(`def swap (a : Nat) := by\n  rotate a\n${theorem}`)).toMatchObject({
      error: { kind: 'name', message: 'reserved helper name: swap' },
    })
    expect(parse(`def f := by\n  swap 0 1\ndef f := by\n  swap 0 1\n${theorem}`)).toMatchObject({
      error: { kind: 'name', line: 2, message: 'duplicate helper: f' },
    })
  })

  it('reports unexpected characters', () => {
    expect(parse(`${theorem}\n  swap 0 $`)).toEqual({
      ok: false,
      error: { kind: 'parse', line: 1, message: 'unexpected character: $' },
    })
  })
})
