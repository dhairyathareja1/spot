export type SavedProgress = {
  clearedLevelIds: number[]
  drafts: Record<number, string>
}

export const PROGRESS_STORAGE_KEY = 'proof-puzzle:progress:v1'

export function loadProgress(): SavedProgress {
  try {
    if (typeof window === 'undefined') return emptyProgress()

    const saved = window.localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (!saved) return emptyProgress()

    return normalizeProgress(JSON.parse(saved))
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(progress: SavedProgress): void {
  try {
    if (typeof window === 'undefined') return

    const previous = loadProgress()
    const merged: SavedProgress = {
      clearedLevelIds: [...new Set([...previous.clearedLevelIds, ...progress.clearedLevelIds])],
      drafts: { ...previous.drafts, ...progress.drafts },
    }
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(merged))
  } catch {
    return
  }
}

export function markLevelCleared(levelId: number): void {
  if (!Number.isSafeInteger(levelId) || levelId < 1) return

  const progress = loadProgress()
  if (progress.clearedLevelIds.includes(levelId)) return

  saveProgress({ ...progress, clearedLevelIds: [...progress.clearedLevelIds, levelId] })
}

function normalizeProgress(value: unknown): SavedProgress {
  if (!isRecord(value)) return emptyProgress()

  const clearedLevelIds = Array.isArray(value.clearedLevelIds)
    ? [...new Set(value.clearedLevelIds.filter(isLevelId))]
    : []
  const drafts: Record<number, string> = {}

  if (isRecord(value.drafts)) {
    for (const [key, source] of Object.entries(value.drafts)) {
      const levelId = Number(key)
      if (isLevelId(levelId) && typeof source === 'string') drafts[levelId] = source
    }
  }

  return { clearedLevelIds, drafts }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLevelId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function emptyProgress(): SavedProgress {
  return { clearedLevelIds: [], drafts: {} }
}
