import { describe, expect, it } from 'vitest'
import { createInitialState, reducer } from '../ui/state'

const solution = `theorem level1 : Solve start target := by
  swap 0 1
  paint 2 purple`

function runSolution() {
  const edited = reducer(createInitialState(), { type: 'EDIT', source: solution })
  return reducer(edited, { type: 'RUN' })
}

describe('UI reducer', () => {
  it('runs the selected level and starts the trace at cursor zero', () => {
    const state = runSolution()

    expect(state.trace?.solved).toBe(true)
    expect(state.cursor).toBe(0)
    expect(state.diagnostic).toBeUndefined()
  })

  it('clamps forward and backward steps to the available trace', () => {
    let state = runSolution()

    state = reducer(state, { type: 'STEP_BACK' })
    expect(state.cursor).toBe(0)

    state = reducer(state, { type: 'STEP_FWD' })
    state = reducer(state, { type: 'STEP_FWD' })
    state = reducer(state, { type: 'STEP_FWD' })
    expect(state.cursor).toBe(2)
  })

  it('clears stale traces on edits and does not run invalid proof text', () => {
    let state = runSolution()
    state = reducer(state, { type: 'STEP_FWD' })
    state = reducer(state, {
      type: 'EDIT',
      source: 'theorem level1 : Solve start target := by\n  paint 1 cyan',
    })
    state = reducer(state, { type: 'RUN' })

    expect(state.trace).toBeUndefined()
    expect(state.cursor).toBe(0)
    expect(state.diagnostic).toEqual({ kind: 'name', line: 1, message: 'unknown color: cyan' })
  })

  it('resets the current level to its starter code', () => {
    let state = reducer(createInitialState(), { type: 'EDIT', source: 'edited' })
    state = reducer(state, { type: 'RUN' })
    state = reducer(state, { type: 'RESET' })

    expect(state).toEqual({
      levelId: 1,
      source: 'theorem level1 : Solve start target := by\n  sorry\n',
      cursor: 0,
    })
  })

  it('selects a level and loads its starter code', () => {
    const state = reducer(runSolution(), { type: 'SELECT_LEVEL', levelId: 4 })

    expect(state.levelId).toBe(4)
    expect(state.source).toBe('theorem level4 : Solve start target := by\n  sorry\n')
    expect(state.trace).toBeUndefined()
    expect(state.cursor).toBe(0)
  })
})
