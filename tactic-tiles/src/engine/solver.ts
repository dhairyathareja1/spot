import { applyMove, boardDifferenceIndices } from './applyMove'
import { sameFace } from './board'
import type { Board, Move } from './types'

// Picks a useful next move: a swap that fixes two blocks, then one block, then paint or rotate.
export function suggestMove(board: Board, target: Board): Move | undefined {
  const diff = boardDifferenceIndices(board, target)
  const cells = board.cells
  const swappable = (index: number) => !cells[index].pinned

  for (const p of diff) {
    for (const q of diff) {
      if (p < q && swappable(p) && swappable(q)
        && sameFace(cells[q], target.cells[p]) && sameFace(cells[p], target.cells[q])) {
        return { kind: 'swap', a: p, b: q }
      }
    }
  }

  for (const p of diff) {
    for (const q of diff) {
      if (p !== q && swappable(p) && swappable(q) && sameFace(cells[q], target.cells[p])) {
        return { kind: 'swap', a: Math.min(p, q), b: Math.max(p, q) }
      }
    }
  }

  for (const p of diff) {
    const block = cells[p]
    const want = target.cells[p]
    if (block.locked || !want) continue
    if (block.color !== want.color) {
      const moved = applyMove(board, { kind: 'paint', i: p, color: want.color })
      if (moved.ok) return { kind: 'paint', i: p, color: want.color }
    } else if (block.canRotate) {
      const turns = (want.rot - block.rot + 4) % 4
      return { kind: 'rotate', i: p, dir: turns === 3 ? 'ccw' : 'cw' }
    }
  }

  // last option: swap in a block that at least has the right color
  for (const p of diff) {
    for (const q of diff) {
      if (p !== q && swappable(p) && swappable(q) && cells[q].color === target.cells[p]?.color) {
        return { kind: 'swap', a: Math.min(p, q), b: Math.max(p, q) }
      }
    }
  }

  return undefined
}

// Keeps applying suggestMove until the board matches. Returns undefined if it gets stuck.
export function solveGreedy(start: Board, target: Board, limit = 128): Move[] | undefined {
  const moves: Move[] = []
  let board = start

  while (boardDifferenceIndices(board, target).length > 0) {
    if (moves.length >= limit) return undefined
    const move = suggestMove(board, target)
    if (!move) return undefined
    const next = applyMove(board, move)
    if (next.ok === false) return undefined
    board = next.value
    moves.push(move)
  }

  return moves
}

export function formatMove(move: Move): string {
  switch (move.kind) {
    case 'swap':
      return `swap ${move.a} ${move.b}`
    case 'paint':
      return `paint ${move.i} ${move.color}`
    case 'rotate':
      return `rotate ${move.i}${move.dir === 'ccw' ? ' ccw' : ''}`
  }
}
