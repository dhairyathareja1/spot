import { describe, expect, it } from 'vitest'
import { grid, toGrid } from '../engine/board'
import { parseRoute, routeHref } from '../ui/router'
import { decodeBase64Url, decodePuzzle, encodeBase64Url, encodePuzzle } from '../ui/share'

describe('share links', () => {
  it('round-trips unicode text through base64url', () => {
    const text = 'theorem t : Solve start target := by\n  paint 0 teal -- café'
    const encoded = encodeBase64Url(text)
    expect(encoded).not.toMatch(/[+/=]/)
    expect(decodeBase64Url(encoded)).toBe(text)
  })

  it('round-trips a custom puzzle', () => {
    const puzzle = { name: 'Pins', start: grid(['b g!', 'y> p*']), target: grid(['g b!', 'y p*']), allowHelpers: true, allowLoops: false, maxLines: 4 }
    const decoded = decodePuzzle(encodePuzzle(puzzle))

    expect(decoded?.name).toBe('Pins')
    expect(toGrid(decoded!.start)).toEqual(['b g!', 'y> p*'])
    expect(decoded?.allowLoops).toBe(false)
    expect(decoded?.maxLines).toBe(4)
  })

  it('rejects garbage and mismatched boards', () => {
    expect(decodePuzzle('not-a-puzzle')).toBeUndefined()
    expect(decodePuzzle(encodeBase64Url(JSON.stringify({ v: 1, s: ['b g'], t: ['b'] })))).toBeUndefined()
  })
})

describe('router', () => {
  it('parses and builds routes', () => {
    expect(parseRoute('#/level/3?proof=abc')).toEqual({ screen: 'level', id: 3, proof: 'abc' })
    expect(parseRoute('#/random/hard/xyz')).toEqual({ screen: 'random', difficulty: 'hard', seed: 'xyz' })
    expect(parseRoute('#/level/nope')).toEqual({ screen: 'home' })
    expect(parseRoute('')).toEqual({ screen: 'home' })
    expect(routeHref({ screen: 'custom', data: 'abc', proof: 'p' })).toBe('#/custom/abc?proof=p')
  })
})
