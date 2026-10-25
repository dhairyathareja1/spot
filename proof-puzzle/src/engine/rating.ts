export type StarRating = 1 | 2 | 3

export type ProofScore = {
  solved: boolean
  // moves after helpers and loops are expanded
  moves: number
  // lines written in the proof
  size: number
}

export type ParTargets = {
  par: number
  parSize?: number
}

// 3 stars: match the move par, and the line par if the level has one. 2 stars: close to it.
export function rateProof(score: ProofScore, targets: ParTargets): StarRating | 0 {
  if (!score.solved) return 0

  const efficient = score.moves <= targets.par
  const concise = targets.parSize === undefined ? efficient : score.size <= targets.parSize

  if (efficient && concise) return 3
  if (efficient || concise || score.moves <= targets.par + 2) return 2
  return 1
}
