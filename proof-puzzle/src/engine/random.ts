import { applyMove, boardDistance } from './applyMove'
import { makeBlock, makeBoard } from './board'
import { solveGreedy } from './solver'
import { COLORS, type Board, type Move } from './types'

export type Rng = () => number

/** mulberry32: tiny, fast, deterministic. Same seed, same puzzle on every machine. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seedFromString(text: string): number {
  let hash = 2166136261
  for (const character of text) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function dailySeed(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export type GeneratedPuzzle = {
  start: Board
  target: Board
  par: number
  scramble: Move[]
}

const shapes: Record<Difficulty, { sizes: [number, number][]; moves: [number, number]; specials: number }> = {
  easy: { sizes: [[1, 4], [2, 2], [1, 5]], moves: [2, 3], specials: 0 },
  medium: { sizes: [[2, 3], [3, 3], [2, 4]], moves: [4, 5], specials: 1 },
  hard: { sizes: [[3, 3], [3, 4], [4, 4]], moves: [6, 8], specials: 3 },
}

export function generatePuzzle(seed: string, difficulty: Difficulty = 'medium'): GeneratedPuzzle {
  const rng = createRng(seedFromString(`${seed}:${difficulty}`))
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)]
  const shape = shapes[difficulty]
  const [rows, cols] = pick(shape.sizes)
  const palette = [...COLORS].sort(() => rng() - 0.5).slice(0, 3 + Math.floor(rng() * 2))

  const cells = Array.from({ length: rows * cols }, () => makeBlock(pick(palette)))
  for (let special = 0; special < shape.specials; special += 1) {
    const index = Math.floor(rng() * cells.length)
    const kind = rng()
    if (kind < 0.4) cells[index] = { ...cells[index], pinned: true }
    else if (kind < 0.75) cells[index] = { ...cells[index], locked: true }
    else cells[index] = { ...cells[index], canRotate: false }
  }
  const start = makeBoard(rows, cols, cells)

  const [minMoves, maxMoves] = shape.moves
  const wanted = minMoves + Math.floor(rng() * (maxMoves - minMoves + 1))
  let board = start
  const scramble: Move[] = []

  for (let attempt = 0; scramble.length < wanted && attempt < 400; attempt += 1) {
    const move = randomMove(board, rng, COLORS)
    const next = applyMove(board, move)
    if (next.ok === false) continue
    if (boardDistance(next.value, board) === 0) continue
    board = next.value
    scramble.push(move)
  }

  if (boardDistance(start, board) === 0) return generatePuzzle(`${seed}+`, difficulty)

  const greedy = solveGreedy(start, board)
  const par = Math.min(scramble.length, greedy?.length ?? Infinity)
  return { start, target: board, par, scramble }
}

function randomMove(board: Board, rng: Rng, palette: readonly (typeof COLORS)[number][]): Move {
  const size = board.cells.length
  const index = Math.floor(rng() * size)
  const roll = rng()
  if (roll < 0.45 && size > 1) {
    let other = Math.floor(rng() * (size - 1))
    if (other >= index) other += 1
    return { kind: 'swap', a: Math.min(index, other), b: Math.max(index, other) }
  }
  if (roll < 0.75) return { kind: 'paint', i: index, color: palette[Math.floor(rng() * palette.length)] }
  return { kind: 'rotate', i: index, dir: rng() < 0.5 ? 'cw' : 'ccw' }
}
