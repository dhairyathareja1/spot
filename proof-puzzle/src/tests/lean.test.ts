import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exportLean, leanPlaygroundUrl } from '../engine/lean'
import { findLevel, levels } from '../levels/levels'

const leanDir = resolve(__dirname, '../../lean')
const verifyWithLean = Boolean(process.env.LEAN_VERIFY)

function exportLevel(id: number, source = findLevel(id)!.solution) {
  const level = findLevel(id)!
  return exportLean({ name: `level${level.id}`, start: level.start, target: level.target, source })
}

function checkWithLean(fileName: string, code: string): string {
  const generated = join(leanDir, 'generated')
  mkdirSync(generated, { recursive: true })
  const file = join(generated, fileName)
  writeFileSync(file, code)
  const lean = join(homedir(), '.elan', 'bin', 'lean')
  try {
    return execFileSync(lean, [file], { cwd: leanDir, encoding: 'utf8', stdio: 'pipe' })
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string }
    throw new Error(`${failure.stdout ?? ''}${failure.stderr ?? ''}`)
  }
}

describe('exportLean', () => {
  it('writes boards, helper macros and the theorem', () => {
    const code = exportLevel(10)

    expect(code).toContain('import Lean')
    expect(code).toContain('def start : Board := [')
    expect(code).toContain('{ color := .green }')
    expect(code).toContain('macro "swapAndPaint " a:term:max b:term:max c:term:max : tactic => `(tactic| (')
    expect(code).toContain('  swap $a $b')
    expect(code).toContain('  paint $a $c))')
    expect(code).toContain('theorem level10 : Solve start target := by\n  swapAndPaint 0 1 teal')
  })

  it('keeps for loops and arithmetic unchanged', () => {
    expect(exportLevel(21)).toContain('    tile (r * 4 + c * 2 + r % 2)')
  })

  it('comments out proofs that do not parse', () => {
    expect(exportLevel(1, 'swap 0 1')).toContain('-- This proof does not parse yet')
  })

  it('builds a Lean 4 web editor link', () => {
    expect(leanPlaygroundUrl('theorem x')).toBe('https://live.lean-lang.org/#code=theorem%20x')
  })

  it.runIf(verifyWithLean).each(levels)('level $id reference proof checks in Lean 4', (level) => {
    expect(() => checkWithLean(`Level${level.id}.lean`, exportLevel(level.id))).not.toThrow()
  }, 120_000)

  it.runIf(verifyWithLean)('Lean rejects an illegal move', () => {
    const code = exportLevel(5, 'theorem level5 : Solve start target := by\n  swap 0 1\n  paint 3 orange')
    expect(() => checkWithLean('Illegal.lean', code)).toThrow(/illegal move/)
  }, 120_000)
})
