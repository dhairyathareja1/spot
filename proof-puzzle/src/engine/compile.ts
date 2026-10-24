import { expand } from './expand'
import { parse } from './parse'
import { proofSize } from './proofSize'
import { resolve } from './resolve'
import { run } from './run'
import type { Diagnostic, Level, ParsedProof, Trace } from './types'

export function compile(level: Level, source: string): { trace: Trace } | { diagnostic: Diagnostic } {
  const parsed = parse(source)
  if (parsed.ok === false) return { diagnostic: parsed.error }

  if (parsed.value.helpers.length > 0 && !level.allowHelpers) {
    return {
      diagnostic: {
        kind: 'level',
        line: parsed.value.helpers[0].line,
        message: 'helper definitions are not allowed on this level',
      },
    }
  }

  const resolved = resolve(parsed.value)
  if (resolved.ok === false) return { diagnostic: resolved.error }

  if (level.maxLines !== undefined) {
    const size = proofSize(parsed.value)
    if (size > level.maxLines) {
      return {
        diagnostic: {
          kind: 'limit',
          line: lastStatementLine(parsed.value),
          message: `proof is ${size} lines, this level allows at most ${level.maxLines}`,
        },
      }
    }
  }

  const expanded = expand(resolved.value)
  if (expanded.ok === false) return { diagnostic: expanded.error }

  const trace = run(level, expanded.value)
  if (!trace.failedAt && containsSorry(parsed.value)) {
    return { trace: { ...trace, solved: false } }
  }

  return { trace }
}

function containsSorry(proof: ParsedProof): boolean {
  return proof.body.some((statement) => statement.name === 'sorry')
    || proof.helpers.some((helper) => helper.body.some((statement) => statement.name === 'sorry'))
}

function lastStatementLine(proof: ParsedProof): number {
  const lines = [
    ...proof.helpers.flatMap((helper) => helper.body.map((statement) => statement.line)),
    ...proof.body.map((statement) => statement.line),
  ]
  return lines.reduce((lastLine, line) => Math.max(lastLine, line), 0)
}
