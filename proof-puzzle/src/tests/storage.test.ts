import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadProgress, markLevelCleared, PROGRESS_STORAGE_KEY, saveBestStars, saveProgress } from '../ui/storage'

const values = new Map<string, string>()
const localStorageMock = {
  getItem: vi.fn((key: string) => values.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => values.set(key, value)),
}

beforeEach(() => {
  values.clear()
  vi.clearAllMocks()
  vi.stubGlobal('window', { localStorage: localStorageMock })
})

afterEach(() => vi.unstubAllGlobals())

describe('progress storage', () => {
  it('returns empty progress when nothing is saved', () => {
    expect(loadProgress()).toEqual({ clearedLevelIds: [], drafts: {}, bestStars: {} })
  })

  it('saves cleared ids, drafts, and best stars', () => {
    const progress = { clearedLevelIds: [1, 3], drafts: { 1: 'proof text' }, bestStars: { 1: 2 as const } }

    saveProgress(progress)

    expect(loadProgress()).toEqual(progress)
  })

  it('ignores corrupt JSON and invalid saved values', () => {
    values.set(PROGRESS_STORAGE_KEY, '{bad json')
    expect(loadProgress()).toEqual({ clearedLevelIds: [], drafts: {}, bestStars: {} })

    values.set(PROGRESS_STORAGE_KEY, JSON.stringify({ clearedLevelIds: [1], drafts: {} }))
    expect(loadProgress()).toEqual({ clearedLevelIds: [1], drafts: {}, bestStars: {} })

    values.set(PROGRESS_STORAGE_KEY, JSON.stringify({
      clearedLevelIds: [1, '2', 1, 0],
      drafts: { 1: 'valid draft', invalid: 'ignored', 2: 4 },
      bestStars: { 1: 3, 2: 0, 3: 'two' },
    }))
    expect(loadProgress()).toEqual({
      clearedLevelIds: [1],
      drafts: { 1: 'valid draft' },
      bestStars: { 1: 3 },
    })
  })

  it('marks a level cleared once', () => {
    markLevelCleared(2)
    markLevelCleared(2)

    expect(loadProgress().clearedLevelIds).toEqual([2])
  })

  it('saves only the best star rating for each level', () => {
    saveBestStars(4, 1)
    saveBestStars(4, 3)
    saveBestStars(4, 2)

    expect(loadProgress().bestStars).toEqual({ 4: 3 })
  })

  it('handles storage access failures without throwing', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('blocked') },
        setItem: () => { throw new Error('blocked') },
      },
    })

    expect(loadProgress()).toEqual({ clearedLevelIds: [], drafts: {}, bestStars: {} })
    expect(() => saveProgress({ clearedLevelIds: [], drafts: {}, bestStars: {} })).not.toThrow()
  })
})
