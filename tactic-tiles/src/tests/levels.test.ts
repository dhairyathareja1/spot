import { describe, expect, it } from 'vitest'
import { boardDistance } from '../engine/applyMove'
import { compile, isCompileSuccess } from '../engine/compile'
import { rateProof } from '../engine/rating'
import { chapters, levels } from '../levels/levels'

describe('levels', () => {
  it('have unique, ordered ids and belong to a chapter', () => {
    expect(levels.map((level) => level.id)).toEqual(levels.map((_, index) => index + 1))
    const chapterIds = new Set(chapters.map((chapter) => chapter.id))
    for (const level of levels) expect(chapterIds.has(level.chapter)).toBe(true)
  })

  it.each(levels)('level $id ($title) is solved by its reference proof with three stars', (level) => {
    const result = compile(level, level.solution)

    expect(isCompileSuccess(result)).toBe(true)
    if (!isCompileSuccess(result)) return
    expect(result.trace.solved).toBe(true)
    expect(result.warnings).toEqual([])
    expect(rateProof({ solved: true, moves: result.trace.steps.length, size: result.size }, level)).toBe(3)
  })

  it.each(levels)('level $id starts unsolved and its starter code compiles', (level) => {
    expect(boardDistance(level.start, level.target)).toBeGreaterThan(0)
    const result = compile(level, level.starterCode)
    expect(isCompileSuccess(result) && result.usesSorry).toBe(true)
  })

  it('makes abstraction necessary on levels with a line limit', () => {
    for (const level of levels.filter((item) => item.maxLines !== undefined)) {
      expect(level.par).toBeGreaterThan(level.maxLines!)
    }
  })
})
