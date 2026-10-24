import { compile } from '../engine/compile'
import type { Diagnostic, Trace } from '../engine/types'
import { levels } from '../levels/levels'

export type UIState = {
  levelId: number
  source: string
  trace?: Trace
  diagnostic?: Diagnostic
  cursor: number
}

export type UIAction =
  | { type: 'EDIT'; source: string }
  | { type: 'RUN' }
  | { type: 'STEP_FWD' }
  | { type: 'STEP_BACK' }
  | { type: 'SET_CURSOR'; cursor: number }
  | { type: 'RESET' }
  | { type: 'SELECT_LEVEL'; levelId: number; source?: string }

export function createInitialState(levelId = levels[0].id): UIState {
  const level = levels.find((item) => item.id === levelId) ?? levels[0]
  return { levelId: level.id, source: level.starterCode, cursor: 0 }
}

export function reducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'EDIT':
      return { levelId: state.levelId, source: action.source, cursor: 0 }
    case 'RUN': {
      const level = levels.find((item) => item.id === state.levelId)
      if (!level) return state

      const result = compile(level, state.source)
      if ('trace' in result) {
        return { ...state, trace: result.trace, diagnostic: undefined, cursor: 0 }
      }
      return { ...state, diagnostic: result.diagnostic }
    }
    case 'STEP_FWD':
      return { ...state, cursor: Math.min(lastCursor(state), state.cursor + 1) }
    case 'STEP_BACK':
      return { ...state, cursor: Math.max(0, state.cursor - 1) }
    case 'SET_CURSOR':
      return { ...state, cursor: Math.max(0, Math.min(lastCursor(state), action.cursor)) }
    case 'RESET':
      return createInitialState(state.levelId)
    case 'SELECT_LEVEL': {
      const level = levels.find((item) => item.id === action.levelId)
      return level
        ? { ...createInitialState(level.id), source: action.source ?? level.starterCode }
        : state
    }
  }
}

function lastCursor(state: UIState): number {
  return Math.max(0, (state.trace?.states.length ?? 1) - 1)
}
