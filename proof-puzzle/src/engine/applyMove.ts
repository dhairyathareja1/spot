import { err, ok, type Board, type Block, type Move, type MoveError, type Result } from './types'

export function applyMove(board: Board, move: Move): Result<Board, MoveError> {
  switch (move.kind) {
    case 'swap':
      return swap(board, move.a, move.b)
    case 'paint':
      return paint(board, move.i, move.color)
    case 'rotate':
      return rotate(board, move.i, move.dir)
  }
}

export function boardDistance(a: Board, b: Board): number {
  const cellCount = Math.max(a.cells.length, b.cells.length)
  let distance = 0

  for (let i = 0; i < cellCount; i += 1) {
    const left = a.cells[i]
    const right = b.cells[i]

    if (!left || !right || left.color !== right.color || left.rot !== right.rot) {
      distance += 1
    }
  }

  return distance
}

function swap(board: Board, a: number, b: number): Result<Board, MoveError> {
  const outOfBounds = [...new Set([a, b])].filter((index) => isOutOfBounds(board, index))
  if (outOfBounds.length > 0) {
    return err({ code: 'OUT_OF_BOUNDS', indices: outOfBounds })
  }

  if (a === b) {
    return err({ code: 'SWAP_SAME', indices: [a] })
  }

  const pinned = [a, b].filter((index) => board.cells[index].pinned)
  if (pinned.length > 0) {
    return err({ code: 'PINNED', indices: pinned })
  }

  const cells = board.cells.slice()
  const block = cells[a]
  cells[a] = cells[b]
  cells[b] = block

  return ok({ ...board, cells })
}

function paint(board: Board, index: number, color: Block['color']): Result<Board, MoveError> {
  if (isOutOfBounds(board, index)) {
    return err({ code: 'OUT_OF_BOUNDS', indices: [index] })
  }

  const block = board.cells[index]
  if (block.locked) {
    return err({ code: 'LOCKED', indices: [index] })
  }
  if (block.color === color) {
    return err({ code: 'ALREADY_COLOR', indices: [index] })
  }

  return replaceBlock(board, index, { ...block, color })
}

function rotate(
  board: Board,
  index: number,
  direction: 'cw' | 'ccw',
): Result<Board, MoveError> {
  if (isOutOfBounds(board, index)) {
    return err({ code: 'OUT_OF_BOUNDS', indices: [index] })
  }

  const block = board.cells[index]
  if (block.locked) {
    return err({ code: 'LOCKED', indices: [index] })
  }
  if (!block.canRotate) {
    return err({ code: 'NOT_ROTATABLE', indices: [index] })
  }

  const delta = direction === 'cw' ? 1 : 3
  const rot = ((block.rot + delta) % 4) as Block['rot']
  return replaceBlock(board, index, { ...block, rot })
}

function replaceBlock(board: Board, index: number, block: Block): Result<Board, never> {
  const cells = board.cells.slice()
  cells[index] = block
  return ok({ ...board, cells })
}

function isOutOfBounds(board: Board, index: number): boolean {
  return !Number.isInteger(index) || index < 0 || index >= board.cells.length
}
