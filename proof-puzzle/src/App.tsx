import { useEffect, useReducer, useState } from 'react'
import { boardDistance } from './engine/applyMove'
import { levels } from './levels/levels'
import { BoardView } from './ui/BoardView'
import { TargetView } from './ui/TargetView'
import { createInitialState, reducer } from './ui/state'
import './ui/styles.css'

function App() {
  const [state, dispatch] = useReducer(reducer, createInitialState())
  const [isPlaying, setIsPlaying] = useState(false)
  const level = levels.find((item) => item.id === state.levelId) ?? levels[0]
  const trace = state.trace
  const lastCursor = Math.max(0, (trace?.states.length ?? 1) - 1)
  const currentBoard = trace?.states[state.cursor] ?? level.start
  const distance = trace?.distance[state.cursor] ?? boardDistance(level.start, level.target)
  const failedAt = trace?.failedAt
  const showingMoveError = Boolean(failedAt && state.cursor === failedAt.stepIndex)
  const errorIndices = showingMoveError ? failedAt?.diagnostic.error?.indices ?? [] : []
  const showQED = Boolean(trace?.solved && state.cursor === lastCursor && !state.diagnostic)

  useEffect(() => {
    if (!isPlaying) return
    if (state.diagnostic || !trace || state.cursor >= trace.states.length - 1) return

    const timeout = window.setTimeout(() => dispatch({ type: 'STEP_FWD' }), 600)
    return () => window.clearTimeout(timeout)
  }, [isPlaying, state.cursor, state.diagnostic, trace])

  function getMessage(): string {
    if (state.diagnostic) {
      return `${state.diagnostic.kind} error on line ${state.diagnostic.line + 1}: ${state.diagnostic.message}`
    }
    if (showingMoveError && failedAt) {
      const indices = failedAt.diagnostic.error?.indices
      const blockText = indices?.length ? ` (block${indices.length === 1 ? '' : 's'} ${indices.join(', ')})` : ''
      return `Move error on line ${failedAt.diagnostic.line + 1}: ${failedAt.diagnostic.message}${blockText}`
    }
    if (showQED) return 'Proof complete.'
    if (trace && state.cursor === lastCursor) {
      return `Proof incomplete: ${distance} ${distance === 1 ? 'cell still differs' : 'cells still differ'}`
    }
    return `Goal: ${distance} ${distance === 1 ? 'cell differs' : 'cells differ'}`
  }

  function stopPlayback() {
    setIsPlaying(false)
  }

  function runProof() {
    setIsPlaying(true)
    dispatch({ type: 'RUN' })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-name">Proof Puzzle</p>
          <h1>{level.title}</h1>
          <p className="level-story">{level.story}</p>
        </div>
        <label className="level-picker">
          Level
          <select
            value={level.id}
            onChange={(event) => {
              stopPlayback()
              dispatch({ type: 'SELECT_LEVEL', levelId: Number(event.target.value) })
            }}
          >
            {levels.map((item) => (
              <option value={item.id} key={item.id}>
                {item.id}: {item.title}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="game-layout">
        <section className="board-panel">
          <div className="board-section">
            <h2>Board</h2>
            <BoardView board={currentBoard} errorIndices={errorIndices} />
          </div>
          <TargetView board={level.target} />
        </section>

        <section className="proof-panel" aria-label="Proof editor and controls">
          <label className="editor-label" htmlFor="proof-source">Lean-style proof</label>
          <textarea
            id="proof-source"
            value={state.source}
            spellCheck={false}
            onChange={(event) => {
              stopPlayback()
              dispatch({ type: 'EDIT', source: event.target.value })
            }}
          />
          <div className="controls">
            <button className="run-button" type="button" onClick={runProof}>Run</button>
            <button type="button" onClick={() => { stopPlayback(); dispatch({ type: 'STEP_FWD' }) }} disabled={!trace || state.cursor >= lastCursor}>Step</button>
            <button type="button" onClick={() => { stopPlayback(); dispatch({ type: 'STEP_BACK' }) }} disabled={!trace || state.cursor === 0}>Back</button>
            <button type="button" onClick={() => { stopPlayback(); dispatch({ type: 'RESET' }) }}>Reset</button>
          </div>
          <div className={`message-area${showQED ? ' message-success' : ''}${state.diagnostic || showingMoveError ? ' message-error' : ''}`} role="status" aria-live="polite">
            {showQED && <strong className="qed-banner">QED</strong>}
            {!showQED && <p>{getMessage()}</p>}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
