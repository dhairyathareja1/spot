import type { Board, Diagnostic, MoveError } from '../engine/types'

/** Plain-language explanation of an illegal move, using the board it was tried on. */
export function describeMoveError(error: MoveError, board: Board): string {
  const [index] = error.indices
  switch (error.code) {
    case 'OUT_OF_BOUNDS':
      return `block ${error.indices.join(' and ')} does not exist; this board has blocks 0–${board.cells.length - 1}`
    case 'SWAP_SAME':
      return `cannot swap block ${index} with itself`
    case 'PINNED':
      return `block ${error.indices.join(' and ')} ${error.indices.length > 1 ? 'are' : 'is'} pinned and cannot be swapped`
    case 'LOCKED':
      return `block ${index} is locked: it can be swapped, but not painted or rotated`
    case 'NOT_ROTATABLE':
      return `block ${index} is fixed and cannot rotate`
    case 'ALREADY_COLOR':
      return `block ${index} is already ${board.cells[index]?.color ?? 'that color'}, so painting it changes nothing`
  }
}

export function describeDiagnostic(diagnostic: Diagnostic): string {
  const labels: Record<Diagnostic['kind'], string> = {
    parse: 'syntax',
    name: 'unknown name',
    arity: 'wrong arguments',
    type: 'type mismatch',
    level: 'not allowed here',
    limit: 'too long',
    move: 'illegal move',
  }
  return `${labels[diagnostic.kind]}: ${diagnostic.message}`
}
