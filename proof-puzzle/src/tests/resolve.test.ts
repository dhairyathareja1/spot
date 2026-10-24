import { describe, expect, it } from 'vitest'
import { parse } from '../engine/parse'
import { resolve } from '../engine/resolve'

function resolveSource(source: string) {
  const parsed = parse(source)
  return parsed.ok ? resolve(parsed.value) : parsed
}

describe('resolve', () => {
  it('resolves calls to earlier helpers and substitutes typed parameters', () => {
    const result = resolveSource([
      'def paintAt (i : Nat) (c : Color) := by',
      '  paint i c',
      'theorem level6 : Solve start target := by',
      '  paintAt 2 teal',
    ].join('\n'))

    expect(result).toMatchObject({
      ok: true,
      value: {
        helpers: [{
          name: 'paintAt',
          body: [{
            kind: 'move',
            move: {
              kind: 'paint',
              i: { kind: 'parameter', type: 'Nat', name: 'i' },
              color: { kind: 'parameter', type: 'Color', name: 'c' },
            },
          }],
        }],
        body: [{
          kind: 'call',
          name: 'paintAt',
          args: [
            { kind: 'literal', type: 'Nat', value: 2 },
            { kind: 'literal', type: 'Color', value: 'teal' },
          ],
        }],
      },
    })
  })

  it('reports unknown names, wrong argument counts, and wrong argument types', () => {
    const unknown = resolveSource([
      'theorem level6 : Solve start target := by',
      '  missingHelper 0',
    ].join('\n'))
    expect(unknown).toMatchObject({
      ok: false,
      error: { kind: 'name', line: 1, message: 'unknown tactic: missingHelper' },
    })

    const wrongCount = resolveSource([
      'def paintAt (i : Nat) (c : Color) := by',
      '  paint i c',
      'theorem level6 : Solve start target := by',
      '  paintAt 2',
    ].join('\n'))
    expect(wrongCount).toMatchObject({
      ok: false,
      error: { kind: 'arity', line: 3, message: 'usage: paintAt <i> <c>' },
    })

    const wrongType = resolveSource([
      'def paintAt (i : Nat) (c : Color) := by',
      '  paint i c',
      'theorem level6 : Solve start target := by',
      '  paintAt teal 2',
    ].join('\n'))
    expect(wrongType).toMatchObject({
      ok: false,
      error: { kind: 'type', line: 3, message: 'expected Nat, but teal has type Color' },
    })
  })

  it('allows calls only to helpers defined above the current helper', () => {
    const result = resolveSource([
      'def first := by',
      '  later',
      'def later := by',
      '  swap 0 1',
      'theorem level6 : Solve start target := by',
    ].join('\n'))

    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'name', line: 1, message: 'helper later must be defined before it is called' },
    })

    const recursive = resolveSource([
      'def repeat := by',
      '  repeat',
      'theorem level6 : Solve start target := by',
    ].join('\n'))
    expect(recursive).toMatchObject({
      ok: false,
      error: { kind: 'name', line: 1, message: 'helper repeat must be defined before it is called' },
    })
  })

  it('keeps the existing unknown-color diagnostic', () => {
    const result = resolveSource([
      'theorem level1 : Solve start target := by',
      '  paint 2 cyan',
    ].join('\n'))

    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'name', line: 1, message: 'unknown color: cyan' },
    })
  })
})
