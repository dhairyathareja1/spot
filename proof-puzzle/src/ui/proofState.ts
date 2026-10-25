import type { Trace } from '../engine/types'
import type { LineNote } from './Editor'

// Which board to show for the cursor line, like Lean's infoview.
// If the cursor is inside a helper, show the final board.
export function cursorForCaret(trace: Trace | undefined, theoremLine: number, caretLine: number): number {
  if (!trace) return 0
  const last = trace.states.length - 1
  if (caretLine < theoremLine) return last
  const done = trace.steps.filter((step) => step.origin <= caretLine).length
  return Math.min(done, last)
}

// Note at the end of each theorem line: blocks left, solved, or illegal move.
export function lineNotes(trace: Trace | undefined): Record<number, LineNote> {
  const notes: Record<number, LineNote> = {}
  if (!trace) return notes

  const lastStepForOrigin = new Map<number, number>()
  trace.steps.forEach((step, index) => {
    if (trace.failedAt && index > trace.failedAt.stepIndex) return
    lastStepForOrigin.set(step.origin, index)
  })

  for (const [origin, index] of lastStepForOrigin) {
    if (trace.failedAt?.stepIndex === index) {
      notes[origin] = { text: 'illegal move', tone: 'error' }
      continue
    }
    const left = trace.distance[index + 1]
    notes[origin] = left === 0
      ? { text: 'solved!', tone: 'done' }
      : { text: `${left} left`, tone: 'progress' }
  }

  return notes
}

// Adds a move at the end, replacing sorry if it is there.
export function appendTactic(source: string, tactic: string): string {
  const lines = source.replace(/\s+$/, '').split('\n')
  const sorryIndex = lines.findIndex((line) => line.trim() === 'sorry')
  if (sorryIndex >= 0) {
    const indent = lines[sorryIndex].match(/^\s*/)?.[0] || '  '
    lines[sorryIndex] = `${indent}${tactic}`
    return `${lines.join('\n')}\n`
  }
  return `${lines.join('\n')}\n  ${tactic}\n`
}

// Ignores comments and blank lines when comparing proofs.
export function normalizeProof(source: string): string {
  return source
    .split('\n')
    .map((line) => line.split('--', 1)[0].trim())
    .filter(Boolean)
    .join('\n')
}
