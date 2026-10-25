import { describe, expect, it } from 'vitest'
import { parse } from '../engine/parse'
import { lint, resolve } from '../engine/resolve'

const theorem = 'theorem t : Solve start target := by'

function check(source: string) {
  const parsed = parse(source)
  if (parsed.ok === false) throw new Error(parsed.error.message)
  return resolve(parsed.value)
}

describe('resolve', () => {
  it('resolves built-in moves', () => {
    const result = check(`${theorem}\n  swap 0 1\n  paint 2 teal\n  rotate 3 ccw`)

    expect(result).toEqual({
      ok: true,
      value: {
        helpers: [],
        body: [
          { kind: 'swap', a: { kind: 'nat', value: 0 }, b: { kind: 'nat', value: 1 }, line: 1 },
          { kind: 'paint', i: { kind: 'nat', value: 2 }, color: { kind: 'color', value: 'teal' }, line: 2 },
          { kind: 'rotate', i: { kind: 'nat', value: 3 }, dir: 'ccw', line: 3 },
        ],
      },
    })
  })

  it('reports arity errors with usage hints', () => {
    expect(check(`${theorem}\n  swap 0`)).toMatchObject({ error: { kind: 'arity', message: 'usage: swap <i> <j>' } })
    expect(check(`${theorem}\n  paint 0`)).toMatchObject({ error: { kind: 'arity', message: 'usage: paint <i> <color>' } })
    expect(check(`${theorem}\n  rotate 0 left`)).toMatchObject({ error: { kind: 'arity', message: 'usage: rotate <i> [ccw]' } })
  })

  it('reports type errors between Nat and Color', () => {
    expect(check(`${theorem}\n  swap 0 teal`)).toMatchObject({
      error: { kind: 'type', line: 1, message: 'expected Nat, but teal has type Color' },
    })
    expect(check(`${theorem}\n  paint 0 3`)).toMatchObject({
      error: { kind: 'type', message: 'expected Color, but 3 has type Nat' },
    })
    expect(check(`def f (c : Color) := by\n  rotate (c + 1)\n${theorem}\n  f teal`)).toMatchObject({
      error: { kind: 'type', line: 1, message: 'math only works on numbers (Nat), but c has type Color' },
    })
  })

  it('reports unknown names, colors and tactics', () => {
    expect(check(`${theorem}\n  paint 0 cyan`)).toMatchObject({ error: { kind: 'name', message: 'unknown color: cyan' } })
    expect(check(`${theorem}\n  swap x 1`)).toMatchObject({ error: { kind: 'name', message: 'unknown identifier: x' } })
    expect(check(`${theorem}\n  simp`)).toMatchObject({ error: { kind: 'name', message: 'unknown move: simp' } })
  })

  it('checks helper calls against their parameter types', () => {
    const helper = 'def drop (top : Nat) (c : Color) := by\n  swap top (top + 3)\n  paint (top + 3) c'
    expect(check(`${helper}\n${theorem}\n  drop 0 teal`).ok).toBe(true)
    expect(check(`${helper}\n${theorem}\n  drop teal 0`)).toMatchObject({
      error: { kind: 'type', line: 4, message: 'expected Nat, but teal has type Color' },
    })
    expect(check(`${helper}\n${theorem}\n  drop 0`)).toMatchObject({
      error: { kind: 'arity', message: 'usage: drop <top> <c>' },
    })
  })

  it('forbids recursion and calls to later helpers', () => {
    expect(check(`def f := by\n  f\n${theorem}\n  f`)).toMatchObject({
      error: { kind: 'name', line: 1, message: "helper f can't use itself" },
    })
    expect(check(`def f := by\n  g\ndef g := by\n  swap 0 1\n${theorem}\n  f`)).toMatchObject({
      error: { kind: 'name', line: 1, message: 'write helper g above the place where you use it' },
    })
  })

  it('types loop variables from their range or list', () => {
    expect(check(`${theorem}\n  for c in [teal, blue] do paint 0 c`).ok).toBe(true)
    expect(check(`${theorem}\n  for c in [teal, blue] do rotate c`)).toMatchObject({
      error: { kind: 'type', message: 'expected Nat, but c has type Color' },
    })
    expect(check(`${theorem}\n  for c in [teal, 1] do rotate 0`)).toMatchObject({
      error: { kind: 'type', message: 'all items in a list need the same type: expected Color, but 1 has type Nat' },
    })
    expect(check(`${theorem}\n  for i in [0:4] do swap i (7 - i)`).ok).toBe(true)
  })

  it('lints unused parameters and helpers', () => {
    const resolved = check(`def f (a b : Nat) := by\n  rotate a\ndef g := by\n  swap 0 1\n${theorem}\n  f 0 1`)

    expect(resolved.ok).toBe(true)
    if (resolved.ok) {
      expect(lint(resolved.value)).toEqual([
        { line: 0, message: 'input `b` is never used' },
        { line: 2, message: 'helper `g` is never used' },
      ])
    }
  })
})
