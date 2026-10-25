import type { Board, Diagnostic, MoveError } from '../engine/types'

export function describeMoveError(error: MoveError, board: Board): string {
  const [index] = error.indices
  switch (error.code) {
    case 'OUT_OF_BOUNDS':
      return `block ${error.indices.join(' and ')} does not exist. This board has blocks 0 to ${board.cells.length - 1}`
    case 'SWAP_SAME':
      return `you can't swap block ${index} with itself`
    case 'PINNED':
      return `block ${error.indices.join(' and ')} ${error.indices.length > 1 ? 'are' : 'is'} pinned, so it can't be swapped`
    case 'LOCKED':
      return `block ${index} is locked, so it can't be painted or turned. You can still swap it`
    case 'NOT_ROTATABLE':
      return `block ${index} can't turn`
    case 'ALREADY_COLOR':
      return `block ${index} is already ${board.cells[index]?.color ?? 'that color'}, so painting it does nothing`
  }
}

export function describeDiagnostic(diagnostic: Diagnostic): string {
  const labels: Record<Diagnostic['kind'], string> = {
    parse: 'can\'t read this line',
    name: 'unknown name',
    arity: 'wrong number of inputs',
    type: 'wrong type',
    level: 'not allowed here',
    limit: 'too long',
    move: 'illegal move',
  }
  return `${labels[diagnostic.kind]}: ${diagnostic.message}`
}
