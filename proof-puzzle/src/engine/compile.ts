import { parse } from './parse'
import { run } from './run'
import type { Diagnostic, Level, Trace } from './types'

export function compile(level: Level, source: string): { trace: Trace } | { diagnostic: Diagnostic } {
  const parsed = parse(source)
  if (!parsed.ok) return { diagnostic: parsed.error }

  const trace = run(level, parsed.value)
  if (!trace.failedAt && containsSorry(source)) {
    return { trace: { ...trace, solved: false } }
  }

  return { trace }
}

function containsSorry(source: string): boolean {
  return source.split(/\r?\n/).some((line) => line.split('--', 1)[0].trim() === 'sorry')
}
