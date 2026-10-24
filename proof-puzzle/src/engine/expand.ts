import { describe } from './resolve'
import {
  err,
  ok,
  type Color,
  type Diagnostic,
  type Expr,
  type LoopSource,
  type ResolvedHelper,
  type ResolvedProof,
  type ResolvedStatement,
  type Result,
  type Step,
} from './types'

export const MAX_HELPER_CALL_DEPTH = 8
export const MAX_EXPANDED_STEPS = 200
export const MAX_LOOP_ITERATIONS = 100

type Value = { type: 'Nat'; value: number } | { type: 'Color'; value: Color }

type Env = Map<string, Value>

type Frame = {
  helpers: Map<string, ResolvedHelper>
  steps: Step[]
}

type Scope = {
  env: Env
  callStack: string[]
  origin: number
  depth: number
}

/** Evaluates helpers and loops into the flat list of board moves the proof performs. */
export function expand(proof: ResolvedProof): Result<Step[], Diagnostic> {
  const frame: Frame = { helpers: new Map(proof.helpers.map((helper) => [helper.name, helper])), steps: [] }

  for (const statement of proof.body) {
    const scope: Scope = { env: new Map(), callStack: [], origin: statement.line, depth: 0 }
    const result = expandStatement(statement, scope, frame)
    if (result.ok === false) return err(result.error)
  }

  return ok(frame.steps)
}

function expandBlock(statements: ResolvedStatement[], scope: Scope, frame: Frame): Result<void, Diagnostic> {
  for (const statement of statements) {
    const result = expandStatement(statement, scope, frame)
    if (result.ok === false) return result
  }
  return ok(undefined)
}

function expandStatement(statement: ResolvedStatement, scope: Scope, frame: Frame): Result<void, Diagnostic> {
  const { line } = statement
  const { env, callStack, origin } = scope

  switch (statement.kind) {
    case 'sorry':
      return ok(undefined)

    case 'for': {
      const values = loopValues(statement.source, env, line)
      if (values.ok === false) return err(values.error)
      for (const value of values.value) {
        const inner = new Map(env)
        inner.set(statement.variable, value)
        const label = `${statement.variable} = ${value.value}`
        const result = expandBlock(statement.body, { ...scope, env: inner, callStack: [...callStack, label] }, frame)
        if (result.ok === false) return result
      }
      return ok(undefined)
    }

    case 'call': {
      const helper = frame.helpers.get(statement.name)
      if (!helper) return err({ kind: 'name', line, message: `unknown helper: ${statement.name}` })
      if (scope.depth >= MAX_HELPER_CALL_DEPTH) {
        return err({ kind: 'limit', line, message: `helper call depth exceeds ${MAX_HELPER_CALL_DEPTH}` })
      }

      const inner: Env = new Map()
      for (const [index, parameter] of helper.parameters.entries()) {
        const value = evaluate(statement.args[index], env, line)
        if (value.ok === false) return err(value.error)
        inner.set(parameter.name, value.value)
      }
      const label = [helper.name, ...[...inner.values()].map((value) => String(value.value))].join(' ')
      return expandBlock(helper.body, { env: inner, callStack: [...callStack, label], origin, depth: scope.depth + 1 }, frame)
    }

    case 'swap': {
      const a = evaluateNat(statement.a, env, line)
      if (a.ok === false) return err(a.error)
      const b = evaluateNat(statement.b, env, line)
      if (b.ok === false) return err(b.error)
      return pushStep(frame, { move: { kind: 'swap', a: a.value, b: b.value }, line, origin, callStack })
    }

    case 'paint': {
      const i = evaluateNat(statement.i, env, line)
      if (i.ok === false) return err(i.error)
      const color = evaluate(statement.color, env, line)
      if (color.ok === false) return err(color.error)
      if (color.value.type !== 'Color') {
        return err({ kind: 'type', line, message: `expected Color, but ${describe(statement.color)} has type Nat` })
      }
      return pushStep(frame, { move: { kind: 'paint', i: i.value, color: color.value.value }, line, origin, callStack })
    }

    case 'rotate': {
      const i = evaluateNat(statement.i, env, line)
      if (i.ok === false) return err(i.error)
      return pushStep(frame, { move: { kind: 'rotate', i: i.value, dir: statement.dir }, line, origin, callStack })
    }
  }
}

function pushStep(frame: Frame, step: Step): Result<void, Diagnostic> {
  if (frame.steps.length >= MAX_EXPANDED_STEPS) {
    return err({ kind: 'limit', line: step.line, message: `proof expands to more than ${MAX_EXPANDED_STEPS} steps` })
  }
  frame.steps.push(step)
  return ok(undefined)
}

function loopValues(source: LoopSource, env: Env, line: number): Result<Value[], Diagnostic> {
  if (source.kind === 'list') {
    const values: Value[] = []
    for (const item of source.items) {
      const value = evaluate(item, env, line)
      if (value.ok === false) return err(value.error)
      values.push(value.value)
    }
    return ok(values)
  }

  const start = evaluateNat(source.start, env, line)
  if (start.ok === false) return err(start.error)
  const stop = evaluateNat(source.stop, env, line)
  if (stop.ok === false) return err(stop.error)
  const step = source.step ? evaluateNat(source.step, env, line) : ok(1)
  if (step.ok === false) return err(step.error)
  if (step.value === 0) return err({ kind: 'limit', line, message: 'loop step must be greater than 0' })

  const values: Value[] = []
  for (let value = start.value; value < stop.value; value += step.value) {
    if (values.length >= MAX_LOOP_ITERATIONS) {
      return err({ kind: 'limit', line, message: `loop runs more than ${MAX_LOOP_ITERATIONS} times` })
    }
    values.push({ type: 'Nat', value })
  }
  return ok(values)
}

function evaluateNat(expr: Expr, env: Env, line: number): Result<number, Diagnostic> {
  const value = evaluate(expr, env, line)
  if (value.ok === false) return err(value.error)
  return value.value.type === 'Nat'
    ? ok(value.value.value)
    : err({ kind: 'type', line, message: `expected Nat, but ${describe(expr)} has type Color` })
}

/** Nat arithmetic follows Lean: subtraction truncates at zero and division by zero is zero. */
export function evaluate(expr: Expr, env: Env, line: number): Result<Value, Diagnostic> {
  switch (expr.kind) {
    case 'nat':
      return ok({ type: 'Nat', value: expr.value })
    case 'color':
      return ok({ type: 'Color', value: expr.value })
    case 'var': {
      const value = env.get(expr.name)
      return value ? ok(value) : err({ kind: 'name', line, message: `unbound parameter: ${expr.name}` })
    }
    case 'binop': {
      const left = evaluateNat(expr.left, env, line)
      if (left.ok === false) return err(left.error)
      const right = evaluateNat(expr.right, env, line)
      if (right.ok === false) return err(right.error)
      return ok({ type: 'Nat', value: applyOperator(expr.op, left.value, right.value) })
    }
  }
}

function applyOperator(op: Extract<Expr, { kind: 'binop' }>['op'], left: number, right: number): number {
  switch (op) {
    case '+':
      return left + right
    case '-':
      return Math.max(0, left - right)
    case '*':
      return left * right
    case '/':
      return right === 0 ? 0 : Math.floor(left / right)
    case '%':
      return right === 0 ? left : left % right
  }
}
