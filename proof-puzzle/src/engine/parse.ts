import {
  err,
  isColor,
  ok,
  type BinaryOperator,
  type Diagnostic,
  type Expr,
  type HelperDefinition,
  type HelperParameter,
  type LoopSource,
  type ParameterType,
  type ParsedProof,
  type Result,
  type Statement,
} from './types'

type SourceLine = { index: number; indent: number; text: string }

type Token = { kind: 'ident' | 'num' | 'sym'; text: string }

const identifier = "[A-Za-z_][A-Za-z0-9_']*"
const helperHeaderPattern = new RegExp(`^def\\s+(${identifier})\\s*(.*?)\\s*:=\\s*by\\b(.*)$`)
const theoremHeaderPattern = new RegExp(`^(?:theorem\\s+(${identifier})|example)\\b.*?:=\\s*by\\b(.*)$`)
const binderPattern = new RegExp(`\\(\\s*(${identifier}(?:\\s+${identifier})*)\\s*:\\s*(Nat|Color)\\s*\\)`, 'g')
const tokenPattern = /\s*(?:([A-Za-z_][A-Za-z0-9_']*)|(\d+)|([()[\]:,+\-*/%]))/y

export const RESERVED_NAMES = new Set([
  'theorem', 'example', 'def', 'by', 'sorry', 'swap', 'paint', 'rotate',
  'for', 'in', 'do', 'cw', 'ccw', 'Nat', 'Color',
  'blue', 'green', 'yellow', 'purple', 'orange', 'teal',
])

export function parse(source: string): Result<ParsedProof, Diagnostic> {
  const lines = toSourceLines(source)
  const helpers: HelperDefinition[] = []
  const helperNames = new Set<string>()
  let index = 0

  while (index < lines.length && /^def\b/.test(lines[index].text)) {
    const headerLine = lines[index]
    const header = parseHelperHeader(headerLine)
    if (header.ok === false) return err(header.error)
    if (helperNames.has(header.value.name)) {
      return err({ kind: 'name', line: headerLine.index, message: `duplicate helper: ${header.value.name}` })
    }
    helperNames.add(header.value.name)

    index += 1
    const bodyLines = inlineBody(headerLine, header.value.inline)
    while (index < lines.length && !isHeader(lines[index].text)) {
      bodyLines.push(lines[index])
      index += 1
    }

    const body = parseBlock(bodyLines)
    if (body.ok === false) return err(body.error)
    helpers.push({
      name: header.value.name,
      parameters: header.value.parameters,
      body: body.value,
      line: headerLine.index,
    })
  }

  const headerLine = lines[index]
  const theorem = headerLine ? theoremHeaderPattern.exec(headerLine.text) : null
  if (!headerLine || !theorem) {
    return err({
      kind: 'parse',
      line: headerLine?.index ?? 0,
      message: 'expected theorem declaration ending with := by',
    })
  }

  const bodyLines = inlineBody(headerLine, theorem[2])
  for (const line of lines.slice(index + 1)) {
    if (/^def\b/.test(line.text)) {
      return err({ kind: 'parse', line: line.index, message: 'helper definitions must appear before the theorem' })
    }
    if (/^(theorem|example)\b/.test(line.text)) {
      return err({ kind: 'parse', line: line.index, message: 'only one theorem declaration is allowed' })
    }
    bodyLines.push(line)
  }

  const body = parseBlock(bodyLines)
  if (body.ok === false) return err(body.error)

  return ok({
    helpers,
    theorem: { name: theorem[1] ?? 'example', line: headerLine.index },
    body: body.value,
  })
}

/** Splits source into non-empty lines with comments removed, keeping zero-based line numbers. */
function toSourceLines(source: string): SourceLine[] {
  const result: SourceLine[] = []
  let inBlockComment = false

  source.split(/\r?\n/).forEach((raw, index) => {
    let text = raw
    if (inBlockComment) {
      const end = text.indexOf('-/')
      if (end < 0) return
      text = ' '.repeat(end + 2) + text.slice(end + 2)
      inBlockComment = false
    }

    const blockStart = text.indexOf('/-')
    const lineComment = text.indexOf('--')
    if (blockStart >= 0 && (lineComment < 0 || blockStart < lineComment)) {
      const end = text.indexOf('-/', blockStart + 2)
      if (end < 0) {
        inBlockComment = true
        text = text.slice(0, blockStart)
      } else {
        text = text.slice(0, blockStart) + ' '.repeat(end + 2 - blockStart) + text.slice(end + 2)
      }
    }

    text = text.split('--', 1)[0]
    const trimmed = text.trim()
    if (!trimmed) return
    result.push({ index, indent: text.length - text.trimStart().length, text: trimmed })
  })

  return result
}

function inlineBody(header: SourceLine, rest: string): SourceLine[] {
  const text = rest.trim()
  return text ? [{ index: header.index, indent: header.indent + 1, text }] : []
}

function isHeader(text: string): boolean {
  return /^(def|theorem|example)\b/.test(text)
}

function parseHelperHeader(
  line: SourceLine,
): Result<{ name: string; parameters: HelperParameter[]; inline: string }, Diagnostic> {
  const match = helperHeaderPattern.exec(line.text)
  if (!match) {
    return err({ kind: 'parse', line: line.index, message: 'expected helper definition ending with := by' })
  }

  const name = match[1]
  if (RESERVED_NAMES.has(name)) {
    return err({ kind: 'name', line: line.index, message: `reserved helper name: ${name}` })
  }

  const binderText = match[2].trim()
  if (binderText.replace(binderPattern, '').trim()) {
    return err({ kind: 'parse', line: line.index, message: 'helper parameters must be typed Nat or Color, e.g. (i : Nat)' })
  }

  const parameters: HelperParameter[] = []
  const seen = new Set<string>()
  for (const binder of binderText.matchAll(binderPattern)) {
    for (const parameterName of binder[1].split(/\s+/)) {
      if (seen.has(parameterName)) {
        return err({ kind: 'name', line: line.index, message: `duplicate parameter: ${parameterName}` })
      }
      if (RESERVED_NAMES.has(parameterName)) {
        return err({ kind: 'name', line: line.index, message: `reserved parameter name: ${parameterName}` })
      }
      seen.add(parameterName)
      parameters.push({ name: parameterName, type: binder[2] as ParameterType })
    }
  }

  return ok({ name, parameters, inline: match[3] })
}

function parseBlock(lines: SourceLine[]): Result<Statement[], Diagnostic> {
  const statements: Statement[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const tokens = tokenize(line)
    if (tokens.ok === false) return err(tokens.error)
    const cursor = new TokenCursor(tokens.value, line.index)
    index += 1

    if (cursor.peekText() === 'for') {
      const loop = parseLoopHeader(cursor)
      if (loop.ok === false) return err(loop.error)

      let body: Statement[]
      if (cursor.done()) {
        const nested: SourceLine[] = []
        while (index < lines.length && lines[index].indent > line.indent) {
          nested.push(lines[index])
          index += 1
        }
        if (nested.length === 0) {
          return err({ kind: 'parse', line: line.index, message: 'expected an indented loop body after do' })
        }
        const block = parseBlock(nested)
        if (block.ok === false) return err(block.error)
        body = block.value
      } else {
        const statement = parseStatement(cursor)
        if (statement.ok === false) return err(statement.error)
        body = [statement.value]
      }

      statements.push({ kind: 'for', variable: loop.value.variable, source: loop.value.source, body, line: line.index })
      continue
    }

    const statement = parseStatement(cursor)
    if (statement.ok === false) return err(statement.error)
    statements.push(statement.value)
    if (statement.value.kind === 'sorry') break
  }

  return ok(statements)
}

function parseLoopHeader(cursor: TokenCursor): Result<{ variable: string; source: LoopSource }, Diagnostic> {
  cursor.next()
  const variable = cursor.next()
  if (variable?.kind !== 'ident' || RESERVED_NAMES.has(variable.text)) {
    return cursor.error('expected a loop variable name after for')
  }
  if (cursor.next()?.text !== 'in') return cursor.error('expected in after the loop variable')
  if (cursor.next()?.text !== '[') return cursor.error('expected a range like [0:4] or a list like [0, 2, 5]')

  let source: LoopSource
  if (cursor.peekText() === ']') {
    source = { kind: 'list', items: [] }
  } else if (cursor.peekText() === ':') {
    cursor.next()
    const stop = parseExpr(cursor)
    if (stop.ok === false) return err(stop.error)
    const step = parseOptionalStep(cursor)
    if (step.ok === false) return err(step.error)
    source = { kind: 'range', start: { kind: 'nat', value: 0 }, stop: stop.value, ...(step.value ? { step: step.value } : {}) }
  } else {
    const first = parseExpr(cursor)
    if (first.ok === false) return err(first.error)
    if (cursor.peekText() === ':') {
      cursor.next()
      const stop = parseExpr(cursor)
      if (stop.ok === false) return err(stop.error)
      const step = parseOptionalStep(cursor)
      if (step.ok === false) return err(step.error)
      source = { kind: 'range', start: first.value, stop: stop.value, ...(step.value ? { step: step.value } : {}) }
    } else {
      const items = [first.value]
      while (cursor.peekText() === ',') {
        cursor.next()
        const item = parseExpr(cursor)
        if (item.ok === false) return err(item.error)
        items.push(item.value)
      }
      source = { kind: 'list', items }
    }
  }

  if (cursor.next()?.text !== ']') return cursor.error('expected ] to close the loop range')
  if (cursor.next()?.text !== 'do') return cursor.error('expected do after the loop range')
  return ok({ variable: variable.text, source })
}

function parseOptionalStep(cursor: TokenCursor): Result<Expr | undefined, Diagnostic> {
  if (cursor.peekText() !== ':') return ok(undefined)
  cursor.next()
  return parseExpr(cursor)
}

function parseStatement(cursor: TokenCursor): Result<Statement, Diagnostic> {
  const head = cursor.next()
  if (!head || head.kind !== 'ident') return cursor.error('expected a tactic such as swap, paint or rotate')
  if (head.text === 'for') return cursor.error('nested for loops need their own line')

  const args: Expr[] = []
  while (!cursor.done()) {
    const token = cursor.peek()
    if (token && token.kind === 'sym' && token.text !== '(') {
      return cursor.error(
        '+-*/%'.includes(token.text)
          ? 'wrap arithmetic in parentheses, e.g. swap i (i + 1)'
          : `unexpected ${token.text}`,
      )
    }
    const arg = parsePrimary(cursor)
    if (arg.ok === false) return err(arg.error)
    args.push(arg.value)
  }

  if (head.text === 'sorry' && args.length === 0) return ok({ kind: 'sorry', line: cursor.line })
  return ok({ kind: 'tactic', name: head.text, args, line: cursor.line })
}

function parseExpr(cursor: TokenCursor): Result<Expr, Diagnostic> {
  return parseBinary(cursor, ['+', '-'], (inner) => parseBinary(inner, ['*', '/', '%'], parsePrimary))
}

function parseBinary(
  cursor: TokenCursor,
  operators: BinaryOperator[],
  operand: (cursor: TokenCursor) => Result<Expr, Diagnostic>,
): Result<Expr, Diagnostic> {
  const first = operand(cursor)
  if (first.ok === false) return first
  let left = first.value

  while (operators.includes(cursor.peekText() as BinaryOperator)) {
    const op = cursor.next()!.text as BinaryOperator
    const right = operand(cursor)
    if (right.ok === false) return right
    left = { kind: 'binop', op, left, right: right.value }
  }

  return ok(left)
}

function parsePrimary(cursor: TokenCursor): Result<Expr, Diagnostic> {
  const token = cursor.next()
  if (!token) return cursor.error('expected a value')
  if (token.kind === 'num') {
    const value = Number(token.text)
    return Number.isSafeInteger(value)
      ? ok({ kind: 'nat', value })
      : err({ kind: 'type', line: cursor.line, message: `Nat literal is out of range: ${token.text}` })
  }
  if (token.kind === 'ident') {
    return ok(isColor(token.text) ? { kind: 'color', value: token.text } : { kind: 'var', name: token.text })
  }
  if (token.text === '(') {
    const inner = parseExpr(cursor)
    if (inner.ok === false) return inner
    if (cursor.next()?.text !== ')') return cursor.error('expected )')
    return inner
  }
  return cursor.error(`unexpected ${token.text}`)
}

function tokenize(line: SourceLine): Result<Token[], Diagnostic> {
  const tokens: Token[] = []
  tokenPattern.lastIndex = 0

  while (tokenPattern.lastIndex < line.text.length) {
    const position = tokenPattern.lastIndex
    const match = tokenPattern.exec(line.text)
    if (!match) {
      const character = line.text.slice(position).trimStart()[0]
      return err({ kind: 'parse', line: line.index, message: `unexpected character: ${character}` })
    }
    if (match[1]) tokens.push({ kind: 'ident', text: match[1] })
    else if (match[2]) tokens.push({ kind: 'num', text: match[2] })
    else if (match[3]) tokens.push({ kind: 'sym', text: match[3] })
  }

  return ok(tokens)
}

class TokenCursor {
  private position = 0
  readonly tokens: Token[]
  readonly line: number

  constructor(tokens: Token[], line: number) {
    this.tokens = tokens
    this.line = line
  }

  peek(): Token | undefined {
    return this.tokens[this.position]
  }

  peekText(): string | undefined {
    return this.peek()?.text
  }

  next(): Token | undefined {
    const token = this.tokens[this.position]
    if (token) this.position += 1
    return token
  }

  done(): boolean {
    return this.position >= this.tokens.length
  }

  error(message: string): Result<never, Diagnostic> {
    return err({ kind: 'parse', line: this.line, message })
  }
}
