import { expand } from './expand'
import { parse } from './parse'
import { proofSize } from './proofSize'
import { lint, resolve } from './resolve'
import { run } from './run'
import type { Diagnostic, Level, ParsedProof, Statement, Trace, Warning } from './types'

export type CompileSuccess = {
  trace: Trace
  warnings: Warning[]
  size: number
  usesSorry: boolean
}

export type CompileResult = CompileSuccess | { diagnostic: Diagnostic; warnings?: Warning[] }

type LevelRules = Pick<Level, 'start' | 'target' | 'allowHelpers' | 'allowLoops' | 'maxLines'>

export function compile(level: LevelRules, source: string): CompileResult {
  const parsed = parse(source)
  if (parsed.ok === false) return { diagnostic: parsed.error }
  const proof = parsed.value

  if (proof.helpers.length > 0 && !level.allowHelpers) {
    return {
      diagnostic: { kind: 'level', line: proof.helpers[0].line, message: 'helper definitions are not allowed on this level' },
    }
  }

  const loopLine = firstLoopLine(proof)
  if (loopLine !== undefined && !level.allowLoops) {
    return { diagnostic: { kind: 'level', line: loopLine, message: 'for loops are not allowed on this level' } }
  }

  const resolved = resolve(proof)
  if (resolved.ok === false) return { diagnostic: resolved.error }
  const warnings = lint(resolved.value)

  const size = proofSize(proof)
  if (level.maxLines !== undefined && size > level.maxLines) {
    return {
      diagnostic: {
        kind: 'limit',
        line: lastStatementLine(proof),
        message: `proof is ${size} lines, this level allows at most ${level.maxLines}`,
      },
      warnings,
    }
  }

  const expanded = expand(resolved.value)
  if (expanded.ok === false) return { diagnostic: expanded.error, warnings }

  const usesSorry = sorryLine(proof) !== undefined
  if (usesSorry) warnings.push({ line: proof.theorem.line, message: "declaration uses 'sorry'" })

  const trace = run(level, expanded.value)
  return {
    trace: usesSorry && !trace.failedAt ? { ...trace, solved: false } : trace,
    warnings,
    size,
    usesSorry,
  }
}

export function isCompileSuccess(result: CompileResult): result is CompileSuccess {
  return 'trace' in result
}

function allStatements(proof: ParsedProof): Statement[] {
  const flatten = (statements: Statement[]): Statement[] =>
    statements.flatMap((statement) => (statement.kind === 'for' ? [statement, ...flatten(statement.body)] : [statement]))
  return [...proof.helpers.flatMap((helper) => flatten(helper.body)), ...flatten(proof.body)]
}

function firstLoopLine(proof: ParsedProof): number | undefined {
  return allStatements(proof).find((statement) => statement.kind === 'for')?.line
}

function sorryLine(proof: ParsedProof): number | undefined {
  return allStatements(proof).find((statement) => statement.kind === 'sorry')?.line
}

function lastStatementLine(proof: ParsedProof): number {
  return allStatements(proof).reduce((last, statement) => Math.max(last, statement.line), proof.theorem.line)
}
