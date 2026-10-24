import { applyMove, boardDistance } from './applyMove'
import type { Diagnostic, Level, Step, Trace } from './types'

export function run(level: Level, steps: Step[]): Trace {
  const states = [level.start]
  const distance = [boardDistance(level.start, level.target)]
  let failedAt: Trace['failedAt']

  for (const [stepIndex, step] of steps.entries()) {
    const result = applyMove(states[states.length - 1], step.move)
    if (result.ok === false) {
      const diagnostic: Diagnostic = {
        kind: 'move',
        line: step.line,
        message: result.error.code,
        error: result.error,
      }
      failedAt = { stepIndex, diagnostic }
      break
    }

    states.push(result.value)
    distance.push(boardDistance(result.value, level.target))
  }

  const solved = failedAt === undefined && distance[distance.length - 1] === 0
  return { steps: steps.slice(), states, distance, solved, ...(failedAt ? { failedAt } : {}) }
}
