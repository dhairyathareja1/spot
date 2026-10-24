export type StarRating = 1 | 2 | 3

export function rateProof(solved: boolean, size: number, par: number): StarRating | 0 {
  if (!solved) return 0
  if (size <= par) return 3
  if (size <= par + 1) return 2
  return 1
}
