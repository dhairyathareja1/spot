import { describe, expect, it } from 'vitest'
import { rateProof } from '../engine/rating'

describe('proof rating', () => {
  it('awards one star for a solved proof', () => {
    expect(rateProof(true, 8, 6)).toBe(1)
  })

  it('awards two stars at par plus one statement', () => {
    expect(rateProof(true, 7, 6)).toBe(2)
  })

  it('awards three stars at par or below', () => {
    expect(rateProof(true, 6, 6)).toBe(3)
    expect(rateProof(true, 4, 6)).toBe(3)
  })

  it('does not award stars for an unsolved proof', () => {
    expect(rateProof(false, 1, 6)).toBe(0)
  })
})
