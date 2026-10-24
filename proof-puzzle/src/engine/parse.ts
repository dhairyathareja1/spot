import { err, ok, type Color, type Diagnostic, type Move, type Result, type Step } from './types'

const colors: Color[] = ['blue', 'green', 'yellow', 'purple', 'orange', 'teal']

export function parse(source: string): Result<Step[], Diagnostic> {
  const steps: Step[] = []
  let theoremFound = false

  for (const [line, originalText] of source.split(/\r?\n/).entries()) {
    const text = originalText.split('--', 1)[0].trim()
    if (!text) continue

    if (!theoremFound) {
      if (!/^theorem\b.*:= by$/.test(text)) {
        return err({ kind: 'parse', line, message: 'expected theorem declaration ending with := by' })
      }
      theoremFound = true
      continue
    }

    const tokens = text.split(/\s+/)
    if (tokens[0] === 'sorry') {
      if (tokens.length !== 1) {
        return err({ kind: 'arity', line, message: 'usage: sorry' })
      }
      return ok(steps)
    }

    const result = parseStatement(tokens, line)
    if (result.ok === false) return err(result.error)
    steps.push(result.value)
  }

  if (!theoremFound) {
    return err({ kind: 'parse', line: 0, message: 'expected theorem declaration ending with := by' })
  }

  return ok(steps)
}

function parseStatement(tokens: string[], line: number): Result<Step, Diagnostic> {
  const tactic = tokens[0]
  let move: Move

  switch (tactic) {
    case 'swap': {
      if (tokens.length !== 3) return arityError(line, 'usage: swap <i> <j>')
      const a = parseIndex(tokens[1])
      const b = parseIndex(tokens[2])
      if (a === undefined || b === undefined) return arityError(line, 'usage: swap <i> <j>')
      move = { kind: 'swap', a, b }
      break
    }
    case 'paint': {
      if (tokens.length !== 3) return arityError(line, 'usage: paint <i> <color>')
      const i = parseIndex(tokens[1])
      if (i === undefined) return arityError(line, 'usage: paint <i> <color>')
      const color = parseColor(tokens[2])
      if (!color) return err({ kind: 'name', line, message: `unknown color: ${tokens[2]}` })
      move = { kind: 'paint', i, color }
      break
    }
    case 'rotate': {
      if (tokens.length !== 2 && !(tokens.length === 3 && tokens[2] === 'ccw')) {
        return arityError(line, 'usage: rotate <i> [ccw]')
      }
      const i = parseIndex(tokens[1])
      if (i === undefined) return arityError(line, 'usage: rotate <i> [ccw]')
      move = { kind: 'rotate', i, dir: tokens[2] === 'ccw' ? 'ccw' : 'cw' }
      break
    }
    default:
      return err({ kind: 'name', line, message: `unknown tactic: ${tactic}` })
  }

  return ok({ move, line, callStack: [] })
}

function parseIndex(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined
  const index = Number(value)
  return Number.isSafeInteger(index) ? index : undefined
}

function parseColor(value: string): Color | undefined {
  return colors.find((color) => color === value)
}

function arityError(line: number, message: string): Result<never, Diagnostic> {
  return err({ kind: 'arity', line, message })
}
