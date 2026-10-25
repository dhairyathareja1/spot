import { describe, expect, it } from 'vitest'
import { compile, isCompileSuccess } from '../engine/compile'
import { findLevel } from '../levels/levels'
import { appendTactic, cursorForCaret, lineNotes, normalizeProof } from '../ui/proofState'

const level = findLevel(10)!

function traceFor(source: string) {
  const result = compile(level, source)
  if (!isCompileSuccess(result)) throw new Error('expected a trace')
  return result
}

describe('cursorForCaret', () => {
  const source = [
    'def swapAndPaint (a b : Nat) (c : Color) := by',
    '  swap a b',
    '  paint a c',
    'theorem level10 : Solve start target := by',
    '  swapAndPaint 0 1 teal',
    '  swapAndPaint 2 3 teal',
  ].join('\n')
  const result = traceFor(source)

  it('shows the board after every move produced up to the caret line', () => {
    expect(cursorForCaret(result.trace, result.theoremLine, 3)).toBe(0)
    expect(cursorForCaret(result.trace, result.theoremLine, 4)).toBe(2)
    expect(cursorForCaret(result.trace, result.theoremLine, 5)).toBe(4)
  })

  it('shows the final board while the caret is inside a helper', () => {
    expect(cursorForCaret(result.trace, result.theoremLine, 1)).toBe(4)
  })
})

describe('lineNotes', () => {
  it('annotates theorem lines with the cells left, and marks success and failure', () => {
    const solved = traceFor(findLevel(10)!.solution)
    const notes = lineNotes(solved.trace)
    expect(notes[4]).toEqual({ text: '6 left', tone: 'progress' })
    expect(notes[7]).toEqual({ text: 'solved!', tone: 'done' })

    const failed = traceFor('theorem t : Solve start target := by\n  swap 0 1\n  swap 1 1')
    expect(lineNotes(failed.trace)[2]).toEqual({ text: 'illegal move', tone: 'error' })
  })
})

describe('appendTactic', () => {
  it('replaces a sorry placeholder', () => {
    expect(appendTactic('theorem t : Solve start target := by\n  sorry\n', 'swap 0 1'))
      .toBe('theorem t : Solve start target := by\n  swap 0 1\n')
  })

  it('appends after the last line otherwise', () => {
    expect(appendTactic('theorem t : Solve start target := by\n  swap 0 1\n\n', 'rotate 2'))
      .toBe('theorem t : Solve start target := by\n  swap 0 1\n  rotate 2\n')
  })
})

describe('normalizeProof', () => {
  it('ignores comments and blank lines', () => {
    expect(normalizeProof('a -- note\n\n  b')).toBe(normalizeProof('a\nb'))
  })
})
