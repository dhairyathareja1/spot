import { describe, expect, it } from 'vitest'
import { run } from '../engine/run'
import type { Level, Step } from '../engine/types'
import { levels } from '../levels/levels'

const level = levels[0]

describe('run', () => {
  it('records each board state and distance from the target', () => {
    const steps: Step[] = [
      { move: { kind: 'swap', a: 0, b: 1 }, line: 1, callStack: [] },
      { move: { kind: 'paint', i: 2, color: 'purple' }, line: 2, callStack: [] },
    ]

    const trace = run(level, steps)

    expect(trace.steps).toEqual(steps)
    expect(trace.states).toHaveLength(3)
    expect(trace.distance).toEqual([3, 1, 0])
    expect(trace.solved).toBe(true)
    expect(trace.failedAt).toBeUndefined()
  })

  it('stops on the first illegal move and records its source line', () => {
    const steps: Step[] = [
      { move: { kind: 'swap', a: 0, b: 1 }, line: 2, callStack: [] },
      { move: { kind: 'swap', a: 0, b: 9 }, line: 5, callStack: [] },
      { move: { kind: 'paint', i: 2, color: 'purple' }, line: 6, callStack: [] },
    ]

    const trace = run(level, steps)

    expect(trace.steps).toEqual(steps)
    expect(trace.states).toHaveLength(2)
    expect(trace.distance).toEqual([3, 1])
    expect(trace.solved).toBe(false)
    expect(trace.failedAt).toEqual({
      stepIndex: 1,
      diagnostic: {
        kind: 'move',
        line: 5,
        message: 'OUT_OF_BOUNDS',
        error: { code: 'OUT_OF_BOUNDS', indices: [9] },
      },
    })
  })

  it('marks a board already at the target as solved without a failure', () => {
    const emptyLevel: Level = { ...level, start: level.target }

    const trace = run(emptyLevel, [])

    expect(trace.solved).toBe(true)
    expect(trace.failedAt).toBeUndefined()
    expect(trace.distance).toEqual([0])
  })
})
