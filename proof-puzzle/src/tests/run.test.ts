import { describe, expect, it } from 'vitest'
import { grid } from '../engine/board'
import { run } from '../engine/run'
import type { Step } from '../engine/types'

const level = { start: grid(['b g y']), target: grid(['g b p']) }
const step = (move: Step['move'], line: number): Step => ({ move, line, origin: line, callStack: [] })

describe('run', () => {
  it('records each board state and distance from the target', () => {
    const trace = run(level, [step({ kind: 'swap', a: 0, b: 1 }, 1), step({ kind: 'paint', i: 2, color: 'purple' }, 2)])

    expect(trace.states).toHaveLength(3)
    expect(trace.distance).toEqual([3, 1, 0])
    expect(trace.solved).toBe(true)
    expect(trace.failedAt).toBeUndefined()
  })

  it('stops on the first illegal move and records its source line', () => {
    const trace = run(level, [
      step({ kind: 'swap', a: 0, b: 1 }, 2),
      step({ kind: 'swap', a: 0, b: 9 }, 5),
      step({ kind: 'paint', i: 2, color: 'purple' }, 6),
    ])

    expect(trace.states).toHaveLength(2)
    expect(trace.solved).toBe(false)
    expect(trace.failedAt).toEqual({
      stepIndex: 1,
      diagnostic: { kind: 'move', line: 5, message: 'OUT_OF_BOUNDS', error: { code: 'OUT_OF_BOUNDS', indices: [9] } },
    })
  })

  it('marks a board already at the target as solved', () => {
    const trace = run({ start: level.target, target: level.target }, [])

    expect(trace.solved).toBe(true)
    expect(trace.distance).toEqual([0])
  })
})
