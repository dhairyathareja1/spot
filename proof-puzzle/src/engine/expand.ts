import { err, ok, type Color, type Diagnostic, type Move, type ResolvedHelper, type ResolvedProof, type ResolvedStatement, type ResolvedValue, type Result, type Step } from './types'

export const MAX_HELPER_CALL_DEPTH = 8
export const MAX_EXPANDED_STEPS = 200

type LiteralValue =
  | { kind: 'literal'; type: 'Nat'; value: number }
  | { kind: 'literal'; type: 'Color'; value: Color }

export function expand(proof: ResolvedProof): Result<Step[], Diagnostic> {
  const helpers = new Map(proof.helpers.map((helper) => [helper.name, helper]))
  const steps: Step[] = []
  const result = expandStatements(proof.body, new Map(), [], helpers, steps)
  if (result.ok === false) return err(result.error)
  return ok(steps)
}

function expandStatements(
  statements: ResolvedStatement[],
  parameters: Map<string, LiteralValue>,
  callStack: string[],
  helpers: Map<string, ResolvedHelper>,
  steps: Step[],
): Result<void, Diagnostic> {
  for (const statement of statements) {
    if (statement.kind === 'sorry') continue

    if (statement.kind === 'call') {
      const helper = helpers.get(statement.name)
      if (!helper) {
        return err({ kind: 'name', line: statement.line, message: `unknown helper: ${statement.name}` })
      }
      if (callStack.length >= MAX_HELPER_CALL_DEPTH) {
        return err({
          kind: 'limit',
          line: statement.line,
          message: `helper call depth exceeds ${MAX_HELPER_CALL_DEPTH}`,
        })
      }

      const values: LiteralValue[] = []
      for (const argument of statement.args) {
        const value = materializeValue(argument, parameters, statement.line)
        if (value.ok === false) return err(value.error)
        values.push(value.value)
      }

      const helperParameters = new Map<string, LiteralValue>()
      helper.parameters.forEach((parameter, index) => {
        const value = values[index]
        if (value) helperParameters.set(parameter.name, value)
      })

      const expanded = expandStatements(
        helper.body,
        helperParameters,
        [...callStack, helper.name],
        helpers,
        steps,
      )
      if (expanded.ok === false) return err(expanded.error)
      continue
    }

    const move = materializeMove(statement, parameters)
    if (move.ok === false) return err(move.error)
    if (steps.length >= MAX_EXPANDED_STEPS) {
      return err({
        kind: 'limit',
        line: statement.line,
        message: `proof expands to more than ${MAX_EXPANDED_STEPS} steps`,
      })
    }
    steps.push({ move: move.value, line: statement.line, callStack })
  }

  return ok(undefined)
}

function materializeMove(
  statement: Extract<ResolvedStatement, { kind: 'move' }>,
  parameters: Map<string, LiteralValue>,
): Result<Move, Diagnostic> {
  const { move, line } = statement

  if (move.kind === 'swap') {
    const a = materializeNat(move.a, parameters, line)
    if (a.ok === false) return err(a.error)
    const b = materializeNat(move.b, parameters, line)
    if (b.ok === false) return err(b.error)
    return ok({ kind: 'swap', a: a.value, b: b.value })
  }

  if (move.kind === 'paint') {
    const i = materializeNat(move.i, parameters, line)
    if (i.ok === false) return err(i.error)
    const color = materializeColor(move.color, parameters, line)
    if (color.ok === false) return err(color.error)
    return ok({ kind: 'paint', i: i.value, color: color.value })
  }

  const i = materializeNat(move.i, parameters, line)
  if (i.ok === false) return err(i.error)
  return ok({ kind: 'rotate', i: i.value, dir: move.dir })
}

function materializeNat(
  value: ResolvedValue,
  parameters: Map<string, LiteralValue>,
  line: number,
): Result<number, Diagnostic> {
  const literal = materializeValue(value, parameters, line)
  if (literal.ok === false) return err(literal.error)
  return literal.value.type === 'Nat'
    ? ok(literal.value.value)
    : err({ kind: 'type', line, message: `expected Nat, but ${literal.value.value} has type Color` })
}

function materializeColor(
  value: ResolvedValue,
  parameters: Map<string, LiteralValue>,
  line: number,
): Result<Color, Diagnostic> {
  const literal = materializeValue(value, parameters, line)
  if (literal.ok === false) return err(literal.error)
  return literal.value.type === 'Color'
    ? ok(literal.value.value)
    : err({ kind: 'type', line, message: `expected Color, but ${literal.value.value} has type Nat` })
}

function materializeValue(
  value: ResolvedValue,
  parameters: Map<string, LiteralValue>,
  line: number,
): Result<LiteralValue, Diagnostic> {
  if (value.kind === 'literal') return ok(value)
  const parameter = parameters.get(value.name)
  return parameter
    ? ok(parameter)
    : err({ kind: 'name', line, message: `unbound parameter: ${value.name}` })
}
