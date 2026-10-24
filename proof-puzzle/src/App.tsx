import { useEffect, useReducer, useState } from 'react'
import { boardDifferenceIndices, boardDistance } from './engine/applyMove'
import type { SavedProgress } from './ui/storage'
import { loadProgress, markLevelCleared, saveProgress } from './ui/storage'
import { levels } from './levels/levels'
import { BoardView } from './ui/BoardView'
import { Editor } from './ui/Editor'
import { GoalPanel } from './ui/GoalPanel'
import { SyntaxHelp } from './ui/SyntaxHelp'
import { StepList } from './ui/StepList'
import { TargetView } from './ui/TargetView'
import { getBlockMotionState } from './ui/blockMotionState'
import { createInitialState, reducer } from './ui/state'
import './ui/styles.css'

function initializeState(progress: SavedProgress) {
  const initial = createInitialState()
  return { ...initial, source: progress.drafts[initial.levelId] ?? initial.source }
}

function App() {
  const [progress, setProgress] = useState(loadProgress)
  const [state, dispatch] = useReducer(reducer, progress, initializeState)
  const [isPlaying, setIsPlaying] = useState(false)
  const level = levels.find((item) => item.id === state.levelId) ?? levels[0]
  const trace = state.trace
  const lastCursor = Math.max(0, (trace?.states.length ?? 1) - 1)
  const currentBoard = trace?.states[state.cursor] ?? level.start
  const blockMotionState = getBlockMotionState(level.id, level.start, trace, state.cursor)
  const distance = trace?.distance[state.cursor] ?? boardDistance(level.start, level.target)
  const differingIndices = boardDifferenceIndices(currentBoard, level.target)
  const failedAt = trace?.failedAt
  const showingMoveError = Boolean(failedAt && state.cursor === failedAt.stepIndex)
  const executedLine = state.cursor > 0 ? trace?.steps[state.cursor - 1]?.line : undefined
  const failingLine = failedAt?.diagnostic.line ?? state.diagnostic?.line
  const errorIndices = showingMoveError ? failedAt?.diagnostic.error?.indices ?? [] : []
  const showQED = Boolean(trace?.solved && state.cursor === lastCursor && !state.diagnostic)

  useEffect(() => {
    if (!isPlaying) return
    if (state.diagnostic || !trace || state.cursor >= trace.states.length - 1) return

    const timeout = window.setTimeout(() => dispatch({ type: 'STEP_FWD' }), 600)
    return () => window.clearTimeout(timeout)
  }, [isPlaying, state.cursor, state.diagnostic, trace])

  useEffect(() => saveProgress(progress), [progress])

  useEffect(() => {
    if (showQED) markLevelCleared(level.id)
  }, [level.id, showQED])

  function getMessage(): string {
    if (state.diagnostic) {
      if (state.diagnostic.kind === 'limit' && state.diagnostic.message.startsWith('proof is ')) {
        return state.diagnostic.message
      }
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
    if (showQED) {
      markLevelCleared(level.id)
      setProgress(loadProgress())
    }
  }

  function runProof() {
    stopPlayback()
    setIsPlaying(true)
    dispatch({ type: 'RUN' })
  }

  function stepForward() {
    stopPlayback()
    dispatch({ type: 'STEP_FWD' })
  }

  function stepBack() {
    stopPlayback()
    dispatch({ type: 'STEP_BACK' })
  }

  function editSource(source: string) {
    stopPlayback()
    dispatch({ type: 'EDIT', source })
    setProgress((current) => ({
      ...current,
      drafts: { ...current.drafts, [level.id]: source },
    }))
  }

  function selectLevel(levelId: number) {
    stopPlayback()
    const selectedLevel = levels.find((item) => item.id === levelId)
    if (!selectedLevel) return

    const savedProgress = loadProgress()
    const nextProgress: SavedProgress = {
      clearedLevelIds: [...new Set([...savedProgress.clearedLevelIds, ...progress.clearedLevelIds])],
      drafts: { ...savedProgress.drafts, ...progress.drafts },
    }
    setProgress(nextProgress)
    dispatch({
      type: 'SELECT_LEVEL',
      levelId,
      source: nextProgress.drafts[levelId] ?? selectedLevel.starterCode,
    })
  }

  function resetLevel() {
    stopPlayback()
    setProgress((current) => ({
      ...current,
      drafts: { ...current.drafts, [level.id]: level.starterCode },
    }))
    dispatch({ type: 'RESET' })
  }

  function nextLevel() {
    const currentIndex = levels.findIndex((item) => item.id === level.id)
    const next = levels[(currentIndex + 1) % levels.length]
    selectLevel(next.id)
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
              selectLevel(Number(event.target.value))
            }}
          >
            {levels.map((item) => (
              <option value={item.id} key={item.id}>
                {progress.clearedLevelIds.includes(item.id) || (showQED && level.id === item.id) ? '✓ ' : ''}
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
            <BoardView
              board={currentBoard}
              blockIds={blockMotionState.blockIds}
              rotationDegrees={blockMotionState.rotationDegrees}
              animated
              errorIndices={errorIndices}
              differingIndices={differingIndices}
            />
            <div className="timeline-control">
              <label htmlFor="run-cursor">
                <span>Run position</span>
                <output>{state.cursor} / {lastCursor}</output>
              </label>
              <input
                id="run-cursor"
                type="range"
                min={0}
                max={lastCursor}
                value={state.cursor}
                disabled={!trace || lastCursor === 0}
                onChange={(event) => {
                  stopPlayback()
                  dispatch({ type: 'SET_CURSOR', cursor: Number(event.target.value) })
                }}
              />
            </div>
          </div>
          <TargetView board={level.target} />
        </section>

        <section className="proof-panel" aria-label="Proof editor and controls">
          <div className="editor-label" id="proof-editor-label">Lean-style proof</div>
          <Editor
            value={state.source}
            onChange={editSource}
            executedLine={executedLine}
            failingLine={failingLine}
            onRun={runProof}
            onStepForward={stepForward}
            onStepBack={stepBack}
          />
          <SyntaxHelp />
          <div className="controls">
            <button className="run-button" type="button" onClick={runProof}>Run</button>
            <button
              type="button"
              onClick={stepForward}
              disabled={!trace || state.cursor >= lastCursor}
            >
              Step
            </button>
            <button
              type="button"
              onClick={stepBack}
              disabled={!trace || state.cursor === 0}
            >
              Back
            </button>
            <button type="button" onClick={resetLevel}>Reset</button>
          </div>
          <GoalPanel distance={distance} differingIndices={differingIndices} />
          <StepList trace={trace} cursor={state.cursor} />
          <div className={`message-area${showQED ? ' message-success' : ''}${state.diagnostic || showingMoveError ? ' message-error' : ''}`} role="status" aria-live="polite">
            {showQED && (
              <div className="qed-content">
                <strong className="qed-banner">QED</strong>
                <button type="button" onClick={nextLevel}>Next level →</button>
              </div>
            )}
            {!showQED && <p>{getMessage()}</p>}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
