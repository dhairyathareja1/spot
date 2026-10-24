import { err, ok, type Color, type Diagnostic, type ParameterType, type ParsedProof, type ProofStatement, type ResolvedHelper, type ResolvedMove, type ResolvedProof, type ResolvedStatement, type ResolvedValue, type Result } from './types'

const colors = new Set<Color>(['blue', 'green', 'yellow', 'purple', 'orange', 'teal'])

export function resolve(proof: ParsedProof): Result<ResolvedProof, Diagnostic> {
  const helperNames = new Set(proof.helpers.map((helper) => helper.name))
  const helpers: ResolvedHelper[] = []

  for (const helper of proof.helpers) {
    const parameters = new Map<string, ParameterType>(
      helper.parameters.map((parameter) => [parameter.name, parameter.type]),
    )
    const body = resolveStatements(helper.body, parameters, helpers, helperNames)
    if (body.ok === false) return err(body.error)
    helpers.push({ ...helper, body: body.value })
  }

  const body = resolveStatements(proof.body, new Map(), helpers, helperNames)
  if (body.ok === false) return err(body.error)

  return ok({ helpers, body: body.value })
}

function resolveStatements(
  statements: ProofStatement[],
  parameters: Map<string, ParameterType>,
  availableHelpers: ResolvedHelper[],
  allHelperNames: Set<string>,
): Result<ResolvedStatement[], Diagnostic> {
  const resolved: ResolvedStatement[] = []

  for (const statement of statements) {
    const result = resolveStatement(statement, parameters, availableHelpers, allHelperNames)
    if (result.ok === false) return err(result.error)
    resolved.push(result.value)
  }

  return ok(resolved)
}

function resolveStatement(
  statement: ProofStatement,
  parameters: Map<string, ParameterType>,
  availableHelpers: ResolvedHelper[],
  allHelperNames: Set<string>,
): Result<ResolvedStatement, Diagnostic> {
  if (statement.name === 'sorry') {
    return statement.args.length === 0
      ? ok({ kind: 'sorry', line: statement.line })
      : arityError(statement, 'usage: sorry')
  }

  switch (statement.name) {
    case 'swap':
      return resolveSwap(statement, parameters)
    case 'paint':
      return resolvePaint(statement, parameters)
    case 'rotate':
      return resolveRotate(statement, parameters)
  }

  const helper = availableHelpers.find((item) => item.name === statement.name)
  if (!helper) {
    const message = allHelperNames.has(statement.name)
      ? `helper ${statement.name} must be defined before it is called`
      : `unknown tactic: ${statement.name}`
    return err({ kind: 'name', line: statement.line, message })
  }

  if (statement.args.length !== helper.parameters.length) {
    const parametersText = helper.parameters.map((parameter) => `<${parameter.name}>`).join(' ')
    return arityError(statement, `usage: ${helper.name}${parametersText ? ` ${parametersText}` : ''}`)
  }

  const args: ResolvedValue[] = []
  for (const [index, parameter] of helper.parameters.entries()) {
    const argument = resolveValue(statement.args[index], parameter.type, parameters, statement.line)
    if (argument.ok === false) return err(argument.error)
    args.push(argument.value)
  }

  return ok({ kind: 'call', name: helper.name, args, line: statement.line })
}

function resolveSwap(
  statement: ProofStatement,
  parameters: Map<string, ParameterType>,
): Result<ResolvedStatement, Diagnostic> {
  if (statement.args.length !== 2) return arityError(statement, 'usage: swap <i> <j>')
  const a = resolveValue(statement.args[0], 'Nat', parameters, statement.line)
  if (a.ok === false) return err(a.error)
  const b = resolveValue(statement.args[1], 'Nat', parameters, statement.line)
  if (b.ok === false) return err(b.error)
  const move: ResolvedMove = { kind: 'swap', a: a.value, b: b.value }
  return ok({ kind: 'move', move, line: statement.line })
}

function resolvePaint(
  statement: ProofStatement,
  parameters: Map<string, ParameterType>,
): Result<ResolvedStatement, Diagnostic> {
  if (statement.args.length !== 2) return arityError(statement, 'usage: paint <i> <color>')
  const i = resolveValue(statement.args[0], 'Nat', parameters, statement.line)
  if (i.ok === false) return err(i.error)
  const color = resolveValue(statement.args[1], 'Color', parameters, statement.line)
  if (color.ok === false) return err(color.error)
  const move: ResolvedMove = { kind: 'paint', i: i.value, color: color.value }
  return ok({ kind: 'move', move, line: statement.line })
}

function resolveRotate(
  statement: ProofStatement,
  parameters: Map<string, ParameterType>,
): Result<ResolvedStatement, Diagnostic> {
  if (statement.args.length !== 1 && !(statement.args.length === 2 && statement.args[1] === 'ccw')) {
    return arityError(statement, 'usage: rotate <i> [ccw]')
  }
  const i = resolveValue(statement.args[0], 'Nat', parameters, statement.line)
  if (i.ok === false) return err(i.error)
  const move: ResolvedMove = { kind: 'rotate', i: i.value, dir: statement.args[1] === 'ccw' ? 'ccw' : 'cw' }
  return ok({ kind: 'move', move, line: statement.line })
}

function resolveValue(
  raw: string,
  expected: ParameterType,
  parameters: Map<string, ParameterType>,
  line: number,
): Result<ResolvedValue, Diagnostic> {
  const parameterType = parameters.get(raw)
  if (parameterType) {
    return parameterType === expected
      ? ok({ kind: 'parameter', type: parameterType, name: raw })
      : typeError(line, `expected ${expected}, but parameter ${raw} has type ${parameterType}`)
  }

  if (expected === 'Nat' && /^\d+$/.test(raw)) {
    const value = Number(raw)
    return Number.isSafeInteger(value)
      ? ok({ kind: 'literal', type: 'Nat', value })
      : typeError(line, `Nat literal is out of range: ${raw}`)
  }

  if (expected === 'Color' && colors.has(raw as Color)) {
    return ok({ kind: 'literal', type: 'Color', value: raw as Color })
  }

  if (expected === 'Nat' && colors.has(raw as Color)) {
    return typeError(line, `expected Nat, but ${raw} has type Color`)
  }
  if (expected === 'Color' && /^\d+$/.test(raw)) {
    return typeError(line, `expected Color, but ${raw} has type Nat`)
  }

  const message = expected === 'Color' ? `unknown color: ${raw}` : `unknown name: ${raw}`
  return err({ kind: 'name', line, message })
}

function arityError(statement: ProofStatement, message: string): Result<never, Diagnostic> {
  return err({ kind: 'arity', line: statement.line, message })
}

function typeError(line: number, message: string): Result<never, Diagnostic> {
  return err({ kind: 'type', line, message })
}
