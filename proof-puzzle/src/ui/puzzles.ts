import { makeBoard } from '../engine/board'
import { dailySeed, generatePuzzle } from '../engine/random'
import { formatMove, solveGreedy } from '../engine/solver'
import type { Board, Concept, Level } from '../engine/types'
import { chapters, findLevel, levels, starterCode } from '../levels/levels'
import type { Route } from './router'
import { decodePuzzle } from './share'
import { levelKey } from './storage'

export type Puzzle = {
  key: string
  kind: 'level' | 'daily' | 'random' | 'custom'
  eyebrow: string
  title: string
  story: string
  level: Level
  concept?: Concept
  next?: Route
  prev?: Route
  /** Route that reopens this exact puzzle with a proof attached. */
  share: (proof: string) => Route
}

export function puzzleForRoute(route: Route): Puzzle | undefined {
  switch (route.screen) {
    case 'level': {
      const level = findLevel(route.id)
      if (!level) return undefined
      const chapter = chapters.find((item) => item.id === level.chapter)
      const index = levels.indexOf(level)
      return {
        key: levelKey(level.id),
        kind: 'level',
        eyebrow: `Chapter ${level.chapter} · ${chapter?.title ?? ''} — Level ${level.id}`,
        title: level.title,
        story: level.story,
        level,
        ...(level.concept ? { concept: level.concept } : {}),
        ...(levels[index + 1] ? { next: { screen: 'level', id: levels[index + 1].id } as Route } : {}),
        ...(levels[index - 1] ? { prev: { screen: 'level', id: levels[index - 1].id } as Route } : {}),
        share: (proof) => ({ screen: 'level', id: level.id, proof }),
      }
    }
    case 'daily': {
      const seed = dailySeed()
      return generated(`daily-${seed}`, 'daily', `Daily challenge · ${seed}`, 'Today\'s Proof', generatePuzzle(seed, 'medium'), {
        story: 'A fresh puzzle every day, the same for everyone. Loops and helpers are allowed.',
        share: () => ({ screen: 'daily' }),
      })
    }
    case 'random': {
      const puzzle = generatePuzzle(route.seed, route.difficulty)
      return generated(`random-${route.difficulty}-${route.seed}`, 'random', `Random · ${capitalize(route.difficulty)}`, `Puzzle #${shortSeed(route.seed)}`, puzzle, {
        story: 'A generated puzzle. Par is the best solution our solver found, so you might beat it.',
        next: { screen: 'random', difficulty: route.difficulty, seed: randomSeed() },
        share: () => ({ screen: 'random', difficulty: route.difficulty, seed: route.seed }),
      })
    }
    case 'custom': {
      const custom = decodePuzzle(route.data)
      if (!custom) return undefined
      const moves = solveGreedy(custom.start, custom.target)
      const level = customLevel(custom.start, custom.target, moves?.length ?? 1, custom.allowHelpers, custom.allowLoops, custom.maxLines)
      return {
        key: `custom-${route.data.slice(0, 48)}`,
        kind: 'custom',
        eyebrow: 'Community puzzle',
        title: custom.name,
        story: 'Built in the workshop and shared by link.',
        level,
        share: (proof) => ({ screen: 'custom', data: route.data, proof }),
      }
    }
    default:
      return undefined
  }
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8)
}

function generated(
  key: string,
  kind: 'daily' | 'random',
  eyebrow: string,
  title: string,
  puzzle: { start: Board; target: Board; par: number },
  options: { story: string; next?: Route; share: () => Route },
): Puzzle {
  return {
    key,
    kind,
    eyebrow,
    title,
    story: options.story,
    level: customLevel(puzzle.start, puzzle.target, puzzle.par, true, true),
    ...(options.next ? { next: options.next } : {}),
    share: options.share,
  }
}

function customLevel(start: Board, target: Board, par: number, allowHelpers: boolean, allowLoops: boolean, maxLines?: number): Level {
  const moves = solveGreedy(start, target) ?? []
  const solution = ['theorem puzzle : Solve start target := by', ...moves.map((move) => `  ${formatMove(move)}`)].join('\n')
  return {
    id: 0,
    chapter: 0,
    title: 'Puzzle',
    story: '',
    start,
    target,
    par,
    allowHelpers,
    allowLoops,
    ...(maxLines ? { maxLines } : {}),
    starterCode: starterCode(0).replace('level0', 'puzzle'),
    hint: 'Look for blocks that are simply in each other\'s seats first. Swaps that fix two cells are the best deal.',
    solution,
  }
}

export function emptyBoard(rows: number, cols: number): Board {
  return makeBoard(rows, cols, Array.from({ length: rows * cols }, () => ({
    color: 'blue' as const,
    rot: 0 as const,
    locked: false,
    canRotate: true,
    pinned: false,
  })))
}

function capitalize(text: string): string {
  return text[0].toUpperCase() + text.slice(1)
}

function shortSeed(seed: string): string {
  return seed.slice(0, 6).toUpperCase()
}
