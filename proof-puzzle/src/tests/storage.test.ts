import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyProgress, loadProgress, markConceptSeen, PROGRESS_STORAGE_KEY, recordWin, saveDraft, saveProgress } from '../ui/storage'

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
    expect(loadProgress()).toEqual(emptyProgress())
  })

  it('round-trips progress through localStorage', () => {
    const progress = recordWin(saveDraft(emptyProgress(), 'level-1', 'proof text'), 'level-1', 2, 'proof text')
    saveProgress(progress)

    expect(loadProgress()).toEqual(progress)
  })

  it('migrates v1 progress with numeric level ids', () => {
    values.set('proof-puzzle:progress:v1', JSON.stringify({ clearedLevelIds: [1, 3], drafts: { 1: 'draft' }, bestStars: { 3: 2 } }))

    const progress = loadProgress()

    expect(progress.cleared).toEqual(['level-1', 'level-3'])
    expect(progress.drafts).toEqual({ 'level-1': 'draft' })
    expect(progress.bestStars).toEqual({ 'level-3': 2 })
  })

  it('drops malformed values instead of crashing', () => {
    values.set(PROGRESS_STORAGE_KEY, JSON.stringify({ cleared: [1, 'level-2'], drafts: { a: 3 }, bestStars: { b: 9 }, settings: { sound: 'yes' } }))

    const progress = loadProgress()

    expect(progress.cleared).toEqual(['level-2'])
    expect(progress.drafts).toEqual({})
    expect(progress.bestStars).toEqual({})
    expect(progress.settings.sound).toBe(true)
  })

  it('returns empty progress for invalid JSON', () => {
    values.set(PROGRESS_STORAGE_KEY, '{nope')
    expect(loadProgress()).toEqual(emptyProgress())
  })
})

describe('recordWin', () => {
  it('keeps the best stars and the shortest proof with those stars', () => {
    let progress = recordWin(emptyProgress(), 'level-1', 2, 'a long proof')
    progress = recordWin(progress, 'level-1', 1, 'x')
    expect(progress.bestStars['level-1']).toBe(2)
    expect(progress.bestProofs['level-1']).toBe('a long proof')

    progress = recordWin(progress, 'level-1', 2, 'short')
    expect(progress.bestProofs['level-1']).toBe('short')
    expect(progress.cleared).toEqual(['level-1'])
  })

  it('marks concepts as seen once', () => {
    const progress = markConceptSeen(markConceptSeen(emptyProgress(), 'level-1'), 'level-1')
    expect(progress.seenConcepts).toEqual(['level-1'])
  })
})
