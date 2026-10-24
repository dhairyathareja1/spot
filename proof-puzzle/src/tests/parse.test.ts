import { describe, expect, it } from 'vitest'
import { parse } from '../engine/parse'

describe('parse', () => {
  it('parses statements and keeps zero-based source line numbers', () => {
    const source = [
      '-- level note',
      '',
      'theorem level1 : Solve start target := by',
      '  swap 0 1 -- swap the first two blocks',
      'paint 2 purple',
      'rotate 3 ccw',
    ].join('\n')
    const result = parse(source)

    expect(result).toEqual({
      ok: true,
      value: {
        helpers: [],
        body: [
          { name: 'swap', args: ['0', '1'], line: 3 },
          { name: 'paint', args: ['2', 'purple'], line: 4 },
          { name: 'rotate', args: ['3', 'ccw'], line: 5 },
        ],
      },
    })
  })

  it('parses typed helper definitions before the theorem', () => {
    const source = [
      'def swapAndPaint (a : Nat) (b : Nat) (c : Color) := by',
      '  swap a b',
      '  paint a c',
      'theorem level6 : Solve start target := by',
      '  swapAndPaint 0 1 teal',
    ].join('\n')
    const result = parse(source)

    expect(result).toEqual({
      ok: true,
      value: {
        helpers: [{
          name: 'swapAndPaint',
          parameters: [
            { name: 'a', type: 'Nat' },
            { name: 'b', type: 'Nat' },
            { name: 'c', type: 'Color' },
          ],
          body: [
            { name: 'swap', args: ['a', 'b'], line: 1 },
            { name: 'paint', args: ['a', 'c'], line: 2 },
          ],
          line: 0,
        }],
        body: [{ name: 'swapAndPaint', args: ['0', '1', 'teal'], line: 4 }],
      },
    })
  })

  it('stops the theorem body at sorry and ignores subsequent lines', () => {
    const source = [
      'theorem level1 : Solve start target := by',
      '  swap 0 1',
      '  sorry',
      '  unknown tactic',
    ].join('\n')
    const result = parse(source)

    expect(result).toEqual({
      ok: true,
      value: {
        helpers: [],
        body: [
          { name: 'swap', args: ['0', '1'], line: 1 },
          { name: 'sorry', args: [], line: 2 },
        ],
      },
    })
  })

  it('keeps unknown names and argument counts for resolution', () => {
    const source = [
      'theorem level1 : Solve start target := by',
      '  paint 2 cyan',
      '  swap 0',
    ].join('\n')
    const result = parse(source)

    expect(result).toEqual({
      ok: true,
      value: {
        helpers: [],
        body: [
          { name: 'paint', args: ['2', 'cyan'], line: 1 },
          { name: 'swap', args: ['0'], line: 2 },
        ],
      },
    })
  })

  it('rejects untyped parameters and requires helpers before the theorem', () => {
    const invalidType = [
      'def invalid (a : String) := by',
      '  swap a 1',
      'theorem level1 : Solve start target := by',
    ].join('\n')
    expect(parse(invalidType)).toMatchObject({
      ok: false,
      error: { kind: 'parse', line: 0, message: 'helper parameters must be typed Nat or Color' },
    })

    const lateHelper = [
      'theorem level1 : Solve start target := by',
      'def later := by',
      '  swap 0 1',
    ].join('\n')
    expect(parse(lateHelper)).toMatchObject({
      ok: false,
      error: { kind: 'parse', line: 1, message: 'helper definitions must appear before the theorem' },
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
