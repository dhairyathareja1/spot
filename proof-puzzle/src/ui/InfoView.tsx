import type { Board, Step, Trace } from '../engine/types'
import { formatMove } from '../engine/solver'
import { blockColors } from './colors'

export type InfoMessage = { line: number; text: string; severity: 'error' | 'warning' | 'info' }

type InfoViewProps = {
  board: Board
  target: Board
  differing: number[]
  trace?: Trace
  cursor: number
  messages: InfoMessage[]
  stale: boolean
  onJumpToStep: (cursor: number) => void
}

const facing = ['↑', '→', '↓', '←']

export function InfoView({ board, target, differing, trace, cursor, messages, stale, onJumpToStep }: InfoViewProps) {
  const solved = differing.length === 0
  const lastCursor = trace ? trace.states.length - 1 : 0

  return (
    <section className={`infoview${stale ? ' is-stale' : ''}`} aria-label="Lean infoview">
      <details open className="info-section">
        <summary>
          <span>Goal</span>
          <span className="info-meta">{trace ? `after move ${cursor} of ${lastCursor}` : 'before any moves'}</span>
        </summary>
        <div className="goal-state">
          {solved ? (
            <p className="goal-accomplished">No goals left. Solved!</p>
          ) : (
            <>
              <p className="goal-count">1 goal: make the board match the target</p>
              {differing.slice(0, 6).map((index) => (
                <p className="goal-hyp" key={index}>
                  <span className="hyp-name">c{subscript(index)}</span>
                  <span className="hyp-colon">:</span>
                  <Swatch board={board} index={index} />
                  <span className="hyp-arrow">≠</span>
                  <Swatch board={target} index={index} />
                </p>
              ))}
              {differing.length > 6 && <p className="goal-more">and {differing.length - 6} more</p>}
              <p className="goal-turnstile"><span aria-hidden="true">⊢</span> board = target</p>
            </>
          )}
        </div>
      </details>

      <details open className="info-section">
        <summary>
          <span>Messages</span>
          <span className={`info-badge${messages.some((message) => message.severity === 'error') ? ' is-error' : ''}`}>{messages.length}</span>
        </summary>
        {messages.length === 0 ? (
          <p className="info-empty">No problems found.</p>
        ) : (
          <ul className="message-list">
            {messages.map((message, index) => (
              <li className={`message message-${message.severity}`} key={`${message.line}-${index}`}>
                <span className="message-line">{message.line + 1}</span>
                <span>{message.text}</span>
              </li>
            ))}
          </ul>
        )}
      </details>

      {trace && trace.steps.length > 0 && (
        <details className="info-section">
          <summary>
            <span>All moves</span>
            <span className="info-badge">{trace.steps.length}</span>
          </summary>
          <ol className="step-list">
            {trace.steps.map((step, index) => (
              <StepRow
                key={`${step.line}-${index}`}
                step={step}
                index={index}
                isCurrent={index === cursor - 1}
                isFailing={index === trace.failedAt?.stepIndex}
                onSelect={() => onJumpToStep(Math.min(index + 1, lastCursor))}
              />
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}

function StepRow({ step, index, isCurrent, isFailing, onSelect }: {
  step: Step
  index: number
  isCurrent: boolean
  isFailing: boolean
  onSelect: () => void
}) {
  return (
    <li className={`step-row${isCurrent ? ' is-current' : ''}${isFailing ? ' is-failing' : ''}`}>
      <button type="button" onClick={onSelect}>
        <span className="step-number">{index + 1}</span>
        <code>{formatMove(step.move)}</code>
        {step.callStack.length > 0 && <span className="step-via">from {step.callStack.join(', ')}</span>}
        <span className="step-line">line {step.line + 1}</span>
      </button>
    </li>
  )
}

function Swatch({ board, index }: { board: Board; index: number }) {
  const block = board.cells[index]
  if (!block) return <span className="swatch-text">none</span>
  return (
    <span className="swatch-text">
      <span className="swatch" style={{ background: blockColors[block.color] }} aria-hidden="true" />
      {block.color} {facing[block.rot]}
    </span>
  )
}

function subscript(value: number): string {
  return String(value).replace(/\d/g, (digit) => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)])
}
