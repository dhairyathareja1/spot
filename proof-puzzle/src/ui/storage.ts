import type { StarRating } from '../engine/rating'

export type Settings = {
  sound: boolean
  music: boolean
}

export type SavedProgress = {
  // e.g. "level-3"
  cleared: string[]
  drafts: Record<string, string>
  bestStars: Record<string, StarRating>
  bestProofs: Record<string, string>
  seenConcepts: string[]
  settings: Settings
}

export const PROGRESS_STORAGE_KEY = 'proof-puzzle:progress:v2'
const LEGACY_STORAGE_KEY = 'proof-puzzle:progress:v1'

export const defaultSettings: Settings = { sound: true, music: true }

export function levelKey(id: number): string {
  return `level-${id}`
}

export function emptyProgress(): SavedProgress {
  return { cleared: [], drafts: {}, bestStars: {}, bestProofs: {}, seenConcepts: [], settings: { ...defaultSettings } }
}

export function loadProgress(): SavedProgress {
  try {
    if (typeof window === 'undefined') return emptyProgress()
    const saved = window.localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (saved) return normalizeProgress(JSON.parse(saved))

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    return legacy ? migrateLegacy(JSON.parse(legacy)) : emptyProgress()
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(progress: SavedProgress): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    return
  }
}

export function recordWin(progress: SavedProgress, key: string, stars: StarRating, proof: string): SavedProgress {
  const previousStars = progress.bestStars[key] ?? 0
  const previousProof = progress.bestProofs[key]
  const better = stars > previousStars || (stars === previousStars && (!previousProof || proof.length < previousProof.length))

  return {
    ...progress,
    cleared: progress.cleared.includes(key) ? progress.cleared : [...progress.cleared, key],
    bestStars: { ...progress.bestStars, [key]: Math.max(previousStars, stars) as StarRating },
    bestProofs: better ? { ...progress.bestProofs, [key]: proof } : progress.bestProofs,
  }
}

export function saveDraft(progress: SavedProgress, key: string, source: string): SavedProgress {
  return { ...progress, drafts: { ...progress.drafts, [key]: source } }
}

export function markConceptSeen(progress: SavedProgress, key: string): SavedProgress {
  return progress.seenConcepts.includes(key) ? progress : { ...progress, seenConcepts: [...progress.seenConcepts, key] }
}

function normalizeProgress(value: unknown): SavedProgress {
  if (!isRecord(value)) return emptyProgress()

  const cleared = Array.isArray(value.cleared) ? [...new Set(value.cleared.filter(isString))] : []
  const seenConcepts = Array.isArray(value.seenConcepts) ? [...new Set(value.seenConcepts.filter(isString))] : []
  const settings = isRecord(value.settings)
    ? {
        sound: typeof value.settings.sound === 'boolean' ? value.settings.sound : defaultSettings.sound,
        music: typeof value.settings.music === 'boolean' ? value.settings.music : defaultSettings.music,
      }
    : { ...defaultSettings }

  return {
    cleared,
    drafts: stringRecord(value.drafts),
    bestStars: starRecord(value.bestStars),
    bestProofs: stringRecord(value.bestProofs),
    seenConcepts,
    settings,
  }
}

function migrateLegacy(value: unknown): SavedProgress {
  const progress = emptyProgress()
  if (!isRecord(value)) return progress

  if (Array.isArray(value.clearedLevelIds)) {
    progress.cleared = value.clearedLevelIds.filter(isLevelId).map(levelKey)
  }
  for (const [id, draft] of Object.entries(isRecord(value.drafts) ? value.drafts : {})) {
    if (isLevelId(Number(id)) && typeof draft === 'string') progress.drafts[levelKey(Number(id))] = draft
  }
  for (const [id, stars] of Object.entries(isRecord(value.bestStars) ? value.bestStars : {})) {
    if (isLevelId(Number(id)) && isStarRating(stars)) progress.bestStars[levelKey(Number(id))] = stars
  }
  return progress
}

function stringRecord(value: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!isRecord(value)) return result
  for (const [key, item] of Object.entries(value)) if (typeof item === 'string') result[key] = item
  return result
}

function starRecord(value: unknown): Record<string, StarRating> {
  const result: Record<string, StarRating> = {}
  if (!isRecord(value)) return result
  for (const [key, item] of Object.entries(value)) if (isStarRating(item)) result[key] = item
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isLevelId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isStarRating(value: unknown): value is StarRating {
  return value === 1 || value === 2 || value === 3
}
