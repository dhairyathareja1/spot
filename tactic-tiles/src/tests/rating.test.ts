import { describe, expect, it } from 'vitest'
import { rateProof } from '../engine/rating'

describe('rateProof', () => {
  it('gives no stars to unsolved proofs', () => {
    expect(rateProof({ solved: false, moves: 1, size: 1 }, { par: 2 })).toBe(0)
  })

  it('rates move-count levels by distance from par', () => {
    expect(rateProof({ solved: true, moves: 2, size: 2 }, { par: 2 })).toBe(3)
    expect(rateProof({ solved: true, moves: 4, size: 4 }, { par: 2 })).toBe(2)
    expect(rateProof({ solved: true, moves: 5, size: 5 }, { par: 2 })).toBe(1)
  })

  it('needs both move par and size par for three stars on abstraction levels', () => {
    expect(rateProof({ solved: true, moves: 8, size: 6 }, { par: 8, parSize: 6 })).toBe(3)
    expect(rateProof({ solved: true, moves: 8, size: 8 }, { par: 8, parSize: 6 })).toBe(2)
    expect(rateProof({ solved: true, moves: 9, size: 6 }, { par: 8, parSize: 6 })).toBe(2)
    expect(rateProof({ solved: true, moves: 12, size: 9 }, { par: 8, parSize: 6 })).toBe(1)
  })
})
