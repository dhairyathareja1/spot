export type StarRating = 1 | 2 | 3

export type ProofScore = {
  solved: boolean
  /** Moves the proof performed after expansion. */
  moves: number
  /** Statements written in the source. */
  size: number
}

export type ParTargets = {
  par: number
  parSize?: number
}

/**
 * One star for any valid proof. Matching the move par earns the second star; the third star
 * needs the move par and, on levels that reward abstraction, a proof as short as the reference.
 */
export function rateProof(score: ProofScore, targets: ParTargets): StarRating | 0 {
  if (!score.solved) return 0

  const efficient = score.moves <= targets.par
  const concise = targets.parSize === undefined ? efficient : score.size <= targets.parSize

  if (efficient && concise) return 3
  if (efficient || concise || score.moves <= targets.par + 2) return 2
  return 1
}
