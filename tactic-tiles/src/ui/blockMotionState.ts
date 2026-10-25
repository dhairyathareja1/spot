import type { Board, Trace } from '../engine/types'

type BlockMotionState = {
  blockIds: string[]
  rotationDegrees: number[]
}

export function getBlockMotionState(
  levelKey: string,
  start: Board,
  trace: Trace | undefined,
  cursor: number,
): BlockMotionState {
  const blockIds = start.cells.map((_, index) => `${levelKey}-block-${index}`)
  const rotations = new Map<string, number>()
  blockIds.forEach((id, index) => rotations.set(id, start.cells[index].rot * 90))
  const stepsToReplay = Math.min(
    Math.max(0, cursor),
    trace?.steps.length ?? 0,
    Math.max(0, (trace?.states.length ?? 1) - 1),
  )

  for (let stepIndex = 0; stepIndex < stepsToReplay; stepIndex += 1) {
    const move = trace?.steps[stepIndex]?.move
    if (!move) continue

    if (move.kind === 'swap') {
      if (isValidIndex(move.a, blockIds.length) && isValidIndex(move.b, blockIds.length)) {
        const firstId = blockIds[move.a]
        blockIds[move.a] = blockIds[move.b]
        blockIds[move.b] = firstId
      }
      continue
    }

    if (move.kind === 'rotate' && isValidIndex(move.i, blockIds.length)) {
      const blockId = blockIds[move.i]
      const degrees = rotations.get(blockId) ?? 0
      rotations.set(blockId, degrees + (move.dir === 'cw' ? 90 : -90))
    }
  }

  return {
    blockIds,
    rotationDegrees: blockIds.map((id) => rotations.get(id) ?? 0),
  }
}

function isValidIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length
}
