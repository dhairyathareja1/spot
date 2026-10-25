import library from '../../lean/TacticTiles.lean?raw'
import { parse } from './parse'
import type { Block, Board } from './types'

export type LeanExportInput = {
  name: string
  start: Board
  target: Board
  source: string
}

const theoremHeader = /^(\s*)(?:theorem\s+[A-Za-z_][A-Za-z0-9_']*|example)\b.*?:=\s*by\b(.*)$/

// Builds a .lean file from a proof. Helpers become tactic macros.
export function exportLean({ name, start, target, source }: LeanExportInput): string {
  const lines = source.split(/\r?\n/)
  const parsed = parse(source)
  const sections: string[] = [
    library.trim(),
    '',
    'open TacticTiles',
    '',
    `/-! ## ${name} -/`,
    '',
    `def start : Board := ${formatBoard(start)}`,
    '',
    `def target : Board := ${formatBoard(target)}`,
    '',
  ]

  if (parsed.ok === false) {
    sections.push(`-- This proof does not parse yet: ${parsed.error.message} (line ${parsed.error.line + 1})`)
    sections.push(...lines.map((line) => `-- ${line}`))
    return `${sections.join('\n')}\n`
  }

  const { helpers, theorem } = parsed.value
  helpers.forEach((helper, index) => {
    const end = helpers[index + 1]?.line ?? theorem.line
    const header = lines[helper.line]
    const inline = header.slice(header.search(/:=\s*by\b/)).replace(/^:=\s*by\b/, '').trim()
    const body = [...(inline ? [`  ${inline}`] : []), ...lines.slice(helper.line + 1, end)]
      .map(stripComment)
      .filter((line) => line.trim())
    const parameters = helper.parameters.map((parameter) => parameter.name)
    const binders = parameters.map((parameter) => ` ${parameter}:term:max`).join('')
    const keyword = parameters.length > 0 ? `${helper.name} ` : helper.name
    const signature = helper.parameters.map((parameter) => `(${parameter.name} : ${parameter.type})`).join(' ')

    sections.push(`/-- ${helper.name}${signature ? ` ${signature}` : ''} -/`)
    sections.push(`macro "${keyword}"${binders} : tactic => \`(tactic| (`)
    sections.push(...body.map((line) => substituteParameters(line, parameters)))
    sections[sections.length - 1] += '))'
    sections.push('')
  })

  const theoremLines = lines.slice(theorem.line).map(stripComment)
  const header = theoremHeader.exec(theoremLines[0] ?? '')
  theoremLines[0] = `theorem ${safeName(name)} : Solve start target := by${header?.[2] ?? ''}`
  sections.push(...theoremLines.filter((line, index) => index === 0 || line.trim()))

  return `${sections.join('\n')}\n`
}

export function leanPlaygroundUrl(code: string): string {
  return `https://live.lean-lang.org/#code=${encodeURIComponent(code)}`
}

function formatBoard(board: Board): string {
  const blocks = board.cells.map(formatBlock)
  if (blocks.length <= 4) return `[${blocks.join(', ')}]`
  return `[\n  ${blocks.join(',\n  ')}\n]`
}

function formatBlock(block: Block): string {
  const fields = [`color := .${block.color}`]
  if (block.rot !== 0) fields.push(`rot := ${block.rot}`)
  if (block.locked) fields.push('locked := true')
  if (!block.canRotate) fields.push('canRotate := false')
  if (block.pinned) fields.push('pinned := true')
  return `{ ${fields.join(', ')} }`
}

function substituteParameters(line: string, parameters: string[]): string {
  if (parameters.length === 0) return line
  const pattern = new RegExp(`(?<![A-Za-z0-9_'$])(${parameters.map(escapeRegExp).join('|')})(?![A-Za-z0-9_'])`, 'g')
  return line.replace(pattern, '$$$1')
}

function stripComment(line: string): string {
  return line.split('--', 1)[0].replace(/\s+$/, '')
}

function safeName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^(\d)/, '_$1')
  return cleaned || 'puzzle'
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
