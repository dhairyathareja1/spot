import type { Trace } from '../engine/types'
import type { LineNote } from './Editor'

/**
 * Like Lean's infoview, the board follows the caret: with the caret on a theorem line, show the
 * board after every move that line produced. Above the theorem (inside helpers), show the end.
 */
export function cursorForCaret(trace: Trace | undefined, theoremLine: number, caretLine: number): number {
  if (!trace) return 0
  const last = trace.states.length - 1
  if (caretLine < theoremLine) return last
  const done = trace.steps.filter((step) => step.origin <= caretLine).length
  return Math.min(done, last)
}

/** End-of-line notes for theorem lines: how many cells still differ after that line. */
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

/** Adds a tactic to the end of the proof, replacing a lone `sorry` placeholder. */
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

/** Comments and blank lines do not make a proof different. */
export function normalizeProof(source: string): string {
  return source
    .split('\n')
    .map((line) => line.split('--', 1)[0].trim())
    .filter(Boolean)
    .join('\n')
}
