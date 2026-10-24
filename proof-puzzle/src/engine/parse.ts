import { err, ok, type Diagnostic, type HelperDefinition, type HelperParameter, type ParameterType, type ParsedProof, type ProofStatement, type Result } from './types'

const helperHeaderPattern = /^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*(.*?)\s*:= by$/
const parameterPattern = /\(([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(Nat|Color)\)/g
const reservedNames = new Set([
  'theorem', 'def', 'by', 'sorry', 'swap', 'paint', 'rotate',
  'blue', 'green', 'yellow', 'purple', 'orange', 'teal',
])

export function parse(source: string): Result<ParsedProof, Diagnostic> {
  const lines = source.split(/\r?\n/)
  const helpers: HelperDefinition[] = []
  const helperNames = new Set<string>()
  let index = findNextContentLine(lines, 0)

  while (index < lines.length && /^def\b/.test(content(lines[index]))) {
    const header = content(lines[index])
    const parsedHeader = parseHelperHeader(header, index)
    if (parsedHeader.ok === false) return err(parsedHeader.error)
    if (helperNames.has(parsedHeader.value.name)) {
      return err({ kind: 'name', line: index, message: `duplicate helper: ${parsedHeader.value.name}` })
    }
    helperNames.add(parsedHeader.value.name)

    const definition = parsedHeader.value
    const body: ProofStatement[] = []
    index += 1
    let bodyFinished = false

    while (index < lines.length) {
      const text = content(lines[index])
      if (!text) {
        index += 1
        continue
      }
      if (isHeader(text)) break
      if (bodyFinished) {
        index += 1
        continue
      }

      const statement = parseStatement(text, index)
      if (statement.ok === false) return err(statement.error)
      body.push(statement.value)
      if (statement.value.name === 'sorry') bodyFinished = true
      index += 1
    }

    helpers.push({ ...definition, body })
    index = findNextContentLine(lines, index)
  }

  if (index >= lines.length || !/^theorem\b/.test(content(lines[index]))) {
    return err({
      kind: 'parse',
      line: index < lines.length ? index : 0,
      message: 'expected theorem declaration ending with := by',
    })
  }

  if (!/^theorem\b.*:= by$/.test(content(lines[index]))) {
    return err({
      kind: 'parse',
      line: index,
      message: 'expected theorem declaration ending with := by',
    })
  }

  const body: ProofStatement[] = []
  index += 1
  while (index < lines.length) {
    const text = content(lines[index])
    if (!text) {
      index += 1
      continue
    }
    if (/^def\b/.test(text)) {
      return err({ kind: 'parse', line: index, message: 'helper definitions must appear before the theorem' })
    }
    if (/^theorem\b/.test(text)) {
      return err({ kind: 'parse', line: index, message: 'only one theorem declaration is allowed' })
    }

    const statement = parseStatement(text, index)
    if (statement.ok === false) return err(statement.error)
    body.push(statement.value)
    index += 1
    if (statement.value.name === 'sorry') break
  }

  return ok({ helpers, body })
}

function parseHelperHeader(
  text: string,
  line: number,
): Result<Omit<HelperDefinition, 'body'>, Diagnostic> {
  const match = helperHeaderPattern.exec(text)
  if (!match) {
    return err({ kind: 'parse', line, message: 'expected helper definition ending with := by' })
  }

  const name = match[1]
  if (reservedNames.has(name)) {
    return err({ kind: 'name', line, message: `reserved helper name: ${name}` })
  }

  const parameterText = match[2].trim()
  const parameterMatches = [...parameterText.matchAll(parameterPattern)]
  const unmatchedText = parameterText.replace(parameterPattern, '').trim()
  if (unmatchedText) {
    return err({ kind: 'parse', line, message: 'helper parameters must be typed Nat or Color' })
  }

  const parameters: HelperParameter[] = parameterMatches.map((parameter) => ({
    name: parameter[1],
    type: parameter[2] as ParameterType,
  }))
  const parameterNames = new Set<string>()
  for (const parameter of parameters) {
    if (parameterNames.has(parameter.name)) {
      return err({ kind: 'name', line, message: `duplicate parameter: ${parameter.name}` })
    }
    parameterNames.add(parameter.name)
  }

  return ok({ name, parameters, line })
}

function parseStatement(text: string, line: number): Result<ProofStatement, Diagnostic> {
  const [name, ...args] = text.split(/\s+/)
  if (!name) return err({ kind: 'parse', line, message: 'expected a proof statement' })
  return ok({ name, args, line })
}

function content(line: string): string {
  return line.split('--', 1)[0].trim()
}

function findNextContentLine(lines: string[], start: number): number {
  let index = start
  while (index < lines.length && !content(lines[index])) index += 1
  return index
}

function isHeader(text: string): boolean {
  return /^def\b/.test(text) || /^theorem\b/.test(text)
}
