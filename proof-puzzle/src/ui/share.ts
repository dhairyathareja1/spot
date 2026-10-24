import { grid, toGrid } from '../engine/board'
import type { Board } from '../engine/types'

export type CustomPuzzle = {
  name: string
  start: Board
  target: Board
  allowHelpers: boolean
  allowLoops: boolean
  maxLines?: number
}

type Encoded = { v: 1; n: string; s: string[]; t: string[]; h: 0 | 1; l: 0 | 1; m?: number }

export function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeBase64Url(encoded: string): string | undefined {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
  } catch {
    return undefined
  }
}

export function encodePuzzle(puzzle: CustomPuzzle): string {
  const payload: Encoded = {
    v: 1,
    n: puzzle.name,
    s: toGrid(puzzle.start),
    t: toGrid(puzzle.target),
    h: puzzle.allowHelpers ? 1 : 0,
    l: puzzle.allowLoops ? 1 : 0,
    ...(puzzle.maxLines ? { m: puzzle.maxLines } : {}),
  }
  return encodeBase64Url(JSON.stringify(payload))
}

export function decodePuzzle(encoded: string): CustomPuzzle | undefined {
  try {
    const text = decodeBase64Url(encoded)
    if (!text) return undefined
    const payload = JSON.parse(text) as Partial<Encoded>
    if (payload.v !== 1 || !Array.isArray(payload.s) || !Array.isArray(payload.t)) return undefined
    const start = grid(payload.s)
    const target = grid(payload.t)
    if (start.rows !== target.rows || start.cols !== target.cols) return undefined
    if (start.cells.length === 0 || start.cells.length > 36) return undefined
    return {
      name: typeof payload.n === 'string' && payload.n.trim() ? payload.n.slice(0, 40) : 'Custom puzzle',
      start,
      target,
      allowHelpers: payload.h === 1,
      allowLoops: payload.l === 1,
      ...(typeof payload.m === 'number' && payload.m > 0 ? { maxLines: payload.m } : {}),
    }
  } catch {
    return undefined
  }
}
