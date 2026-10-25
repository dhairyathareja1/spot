import {
  err,
  ok,
  type Diagnostic,
  type Expr,
  type LoopSource,
  type ParameterType,
  type ParsedProof,
  type ResolvedHelper,
  type ResolvedProof,
  type ResolvedStatement,
  type Result,
  type Statement,
  type Warning,
} from './types'

type Scope = Map<string, ParameterType>

type Context = {
  available: ResolvedHelper[]
  allHelperNames: Set<string>
  currentHelper?: string
}

// Checks names and types before anything runs.
export function resolve(proof: ParsedProof): Result<ResolvedProof, Diagnostic> {
  const allHelperNames = new Set(proof.helpers.map((helper) => helper.name))
  const helpers: ResolvedHelper[] = []

  for (const helper of proof.helpers) {
    const scope: Scope = new Map(helper.parameters.map((parameter) => [parameter.name, parameter.type]))
    const context: Context = { available: helpers, allHelperNames, currentHelper: helper.name }
    const body = resolveBlock(helper.body, scope, context)
    if (body.ok === false) return err(body.error)
    helpers.push({ ...helper, body: body.value })
  }

  const context: Context = { available: helpers, allHelperNames }
  const body = resolveBlock(proof.body, new Map(), context)
  if (body.ok === false) return err(body.error)

  return ok({ helpers, body: body.value })
}

// Warnings for unused helpers and helper inputs.
export function lint(proof: ResolvedProof): Warning[] {
  const warnings: Warning[] = []
  const calledHelpers = new Set<string>()
  const visit = (statements: ResolvedStatement[], onExpr: (expr: Expr) => void) => {
    for (const statement of statements) {
      switch (statement.kind) {
        case 'swap':
          onExpr(statement.a)
          onExpr(statement.b)
          break
        case 'paint':
          onExpr(statement.i)
          onExpr(statement.color)
          break
        case 'rotate':
          onExpr(statement.i)
          break
        case 'call':
          calledHelpers.add(statement.name)
          statement.args.forEach(onExpr)
          break
        case 'for':
          loopExprs(statement.source).forEach(onExpr)
          visit(statement.body, onExpr)
          break
      }
    }
  }

  for (const helper of proof.helpers) {
    const usedNames = new Set<string>()
    visit(helper.body, (expr) => collectVars(expr, usedNames))
    for (const parameter of helper.parameters) {
      if (!usedNames.has(parameter.name)) {
        warnings.push({ line: helper.line, message: `input \`${parameter.name}\` is never used` })
      }
    }
  }
  visit(proof.body, () => undefined)

  for (const helper of proof.helpers) {
    if (!calledHelpers.has(helper.name)) {
      warnings.push({ line: helper.line, message: `helper \`${helper.name}\` is never used` })
    }
  }

  return warnings.sort((a, b) => a.line - b.line)
}

function resolveBlock(statements: Statement[], scope: Scope, context: Context): Result<ResolvedStatement[], Diagnostic> {
  const resolved: ResolvedStatement[] = []
  for (const statement of statements) {
    const result = resolveStatement(statement, scope, context)
    if (result.ok === false) return err(result.error)
    resolved.push(result.value)
  }
  return ok(resolved)
}

function resolveStatement(statement: Statement, scope: Scope, context: Context): Result<ResolvedStatement, Diagnostic> {
  const { line } = statement
  if (statement.kind === 'sorry') return ok(statement)

  if (statement.kind === 'for') {
    const variableType = loopType(statement.source, scope, line)
    if (variableType.ok === false) return err(variableType.error)
    const inner = new Map(scope)
    inner.set(statement.variable, variableType.value)
    const body = resolveBlock(statement.body, inner, context)
    if (body.ok === false) return err(body.error)
    return ok({
      kind: 'for',
      variable: statement.variable,
      variableType: variableType.value,
      source: statement.source,
      body: body.value,
      line,
    })
  }

  const { name, args } = statement
  switch (name) {
    case 'sorry':
      return arityError(line, 'usage: sorry')
    case 'swap': {
      if (args.length !== 2) return arityError(line, 'usage: swap <i> <j>')
      const checked = expectTypes(args, ['Nat', 'Nat'], scope, line)
      if (checked.ok === false) return err(checked.error)
      return ok({ kind: 'swap', a: args[0], b: args[1], line })
    }
    case 'paint': {
      if (args.length !== 2) return arityError(line, 'usage: paint <i> <color>')
      const checked = expectTypes(args, ['Nat', 'Color'], scope, line)
      if (checked.ok === false) return err(checked.error)
      return ok({ kind: 'paint', i: args[0], color: args[1], line })
    }
    case 'rotate': {
      const direction = args[1]
      const directionName = direction?.kind === 'var' ? direction.name : undefined
      if (args.length < 1 || args.length > 2 || (args.length === 2 && directionName !== 'cw' && directionName !== 'ccw')) {
        return arityError(line, 'usage: rotate <i> [ccw]')
      }
      const checked = expectTypes(args.slice(0, 1), ['Nat'], scope, line)
      if (checked.ok === false) return err(checked.error)
      return ok({ kind: 'rotate', i: args[0], dir: directionName === 'ccw' ? 'ccw' : 'cw', line })
    }
  }

  const helper = context.available.find((item) => item.name === name)
  if (!helper) {
    let message = `unknown move: ${name}`
    if (name === context.currentHelper) message = `helper ${name} can't use itself`
    else if (context.allHelperNames.has(name)) message = `write helper ${name} above the place where you use it`
    return err({ kind: 'name', line, message })
  }

  if (args.length !== helper.parameters.length) {
    const usage = helper.parameters.map((parameter) => `<${parameter.name}>`).join(' ')
    return arityError(line, `usage: ${helper.name}${usage ? ` ${usage}` : ''}`)
  }
  const checked = expectTypes(args, helper.parameters.map((parameter) => parameter.type), scope, line)
  if (checked.ok === false) return err(checked.error)
  return ok({ kind: 'call', name: helper.name, args, line })
}

function loopType(source: LoopSource, scope: Scope, line: number): Result<ParameterType, Diagnostic> {
  if (source.kind === 'range') {
    const checked = expectTypes(loopExprs(source), loopExprs(source).map(() => 'Nat' as const), scope, line)
    if (checked.ok === false) return err(checked.error)
    return ok('Nat')
  }

  if (source.items.length === 0) return ok('Nat')
  const first = typeOf(source.items[0], scope, line)
  if (first.ok === false) return err(first.error)
  const checked = expectTypes(source.items, source.items.map(() => first.value), scope, line)
  if (checked.ok === false) {
    return err({ ...checked.error, message: `all items in a list need the same type: ${checked.error.message}` })
  }
  return ok(first.value)
}

function loopExprs(source: LoopSource): Expr[] {
  if (source.kind === 'list') return source.items
  return source.step ? [source.start, source.stop, source.step] : [source.start, source.stop]
}

function expectTypes(args: Expr[], types: ParameterType[], scope: Scope, line: number): Result<void, Diagnostic> {
  for (const [index, arg] of args.entries()) {
    if (arg.kind === 'var' && !scope.has(arg.name) && types[index] === 'Color') {
      return err({ kind: 'name', line, message: `unknown color: ${arg.name}` })
    }
    const actual = typeOf(arg, scope, line)
    if (actual.ok === false) return err(actual.error)
    if (actual.value !== types[index]) {
      return err({
        kind: 'type',
        line,
        message: `expected ${types[index]}, but ${describe(arg)} has type ${actual.value}`,
      })
    }
  }
  return ok(undefined)
}

export function typeOf(expr: Expr, scope: Scope, line: number): Result<ParameterType, Diagnostic> {
  switch (expr.kind) {
    case 'nat':
      return ok('Nat')
    case 'color':
      return ok('Color')
    case 'var': {
      const type = scope.get(expr.name)
      return type ? ok(type) : err({ kind: 'name', line, message: `unknown identifier: ${expr.name}` })
    }
    case 'binop': {
      for (const side of [expr.left, expr.right]) {
        const type = typeOf(side, scope, line)
        if (type.ok === false) return type
        if (type.value !== 'Nat') {
          return err({ kind: 'type', line, message: `math only works on numbers (Nat), but ${describe(side)} has type ${type.value}` })
        }
      }
      return ok('Nat')
    }
  }
}

export function describe(expr: Expr): string {
  switch (expr.kind) {
    case 'nat':
      return String(expr.value)
    case 'color':
      return expr.value
    case 'var':
      return expr.name
    case 'binop':
      return `(${describe(expr.left)} ${expr.op} ${describe(expr.right)})`
  }
}

function collectVars(expr: Expr, names: Set<string>) {
  if (expr.kind === 'var') names.add(expr.name)
  if (expr.kind === 'binop') {
    collectVars(expr.left, names)
    collectVars(expr.right, names)
  }
}

function arityError(line: number, message: string): Result<never, Diagnostic> {
  return err({ kind: 'arity', line, message })
}
