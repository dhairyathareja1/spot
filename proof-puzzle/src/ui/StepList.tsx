import type { Move, Step, Trace } from '../engine/types'

type StepListProps = {
  trace?: Trace
  cursor: number
}

export function StepList({ trace, cursor }: StepListProps) {
  if (!trace) return null

  return (
    <section className="step-list" aria-labelledby="expanded-steps-heading">
      <h2 id="expanded-steps-heading">Expanded steps</h2>
      {trace.steps.length === 0 ? (
        <p className="step-list-empty">No moves in this proof.</p>
      ) : (
        <ol>
          {trace.steps.map((step, index) => (
            <StepRow
              key={`${step.line}-${index}`}
              step={step}
              index={index}
              isCurrent={index === cursor - 1}
              isFailing={index === trace.failedAt?.stepIndex}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

type StepRowProps = {
  step: Step
  index: number
  isCurrent: boolean
  isFailing: boolean
}

function StepRow({ step, index, isCurrent, isFailing }: StepRowProps) {
  const rowClass = [
    'step-list-row',
    isCurrent ? 'is-current' : '',
    isFailing ? 'is-failing' : '',
  ].filter(Boolean).join(' ')

  return (
    <li className={rowClass}>
      <div className="step-list-main">
        <span>{index + 1}. {formatMove(step.move)}</span>
        <span className="step-list-line">line {step.line + 1}</span>
      </div>
      {step.callStack.length > 0 && (
        <p className="step-call-stack">via {step.callStack.join(' → ')}</p>
      )}
    </li>
  )
}

function formatMove(move: Move): string {
  switch (move.kind) {
    case 'swap':
      return `swap ${move.a} ${move.b}`
    case 'paint':
      return `paint ${move.i} ${move.color}`
    case 'rotate':
      return `rotate ${move.i}${move.dir === 'ccw' ? ' ccw' : ''}`
  }
}
