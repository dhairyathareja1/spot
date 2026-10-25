import { AnimatePresence } from 'framer-motion'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { boardDifferenceIndices } from '../engine/applyMove'
import { compile, isCompileSuccess, type CompileSuccess } from '../engine/compile'
import { exportLean } from '../engine/lean'
import { rateProof, type StarRating } from '../engine/rating'
import { formatMove, suggestMove } from '../engine/solver'
import { BoardView } from './BoardView'
import { ConceptCard } from './ConceptCard'
import type { EditorMessage } from './Editor'
import { InfoView, type InfoMessage } from './InfoView'
import { LeanDialog } from './LeanDialog'
import { MoveBuilder } from './MoveBuilder'
import { QedDialog } from './QedDialog'
import { SyntaxHelp } from './SyntaxHelp'
import { Timeline } from './Timeline'
import { getBlockMotionState } from './blockMotionState'
import { burstConfetti } from './confetti'
import { describeDiagnostic, describeMoveError } from './messages'
import { chapterTint } from './colors'
import { BackIcon, ChevronLeftIcon, ChevronRightIcon, ExternalIcon, PlayIcon, Stars } from './Icons'
import { appendTactic, cursorForCaret, lineNotes, normalizeProof } from './proofState'
import type { Puzzle } from './puzzles'
import { navigate, routeHref } from './router'
import { decodeBase64Url, encodeBase64Url } from './share'
import { sounds } from './sound'
import { markConceptSeen, recordWin, saveDraft, type SavedProgress } from './storage'

const Editor = lazy(() => import('./Editor').then((module) => ({ default: module.Editor })))

type PlayScreenProps = {
  puzzle: Puzzle
  progress: SavedProgress
  onProgress: (update: (progress: SavedProgress) => SavedProgress) => void
  sharedProof?: string
}

const PLAYBACK_MS = 520

export function PlayScreen({ puzzle, progress, onProgress, sharedProof }: PlayScreenProps) {
  const { level } = puzzle
  const [source, setSource] = useState(() => {
    const shared = sharedProof ? decodeBase64Url(sharedProof) : undefined
    return shared ?? progress.drafts[puzzle.key] ?? level.starterCode
  })
  const [caretLine, setCaretLine] = useState(0)
  const [manualCursor, setManualCursor] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [selected, setSelected] = useState<number | undefined>()
  const [hintLevel, setHintLevel] = useState(0)
  const [qed, setQed] = useState<{ stars: StarRating; newBest: boolean; moves: number; size: number } | null>(null)
  const [celebrated, setCelebrated] = useState<string | null>(() => normalizeProof(source))
  const [leanOpen, setLeanOpen] = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle')
  const [showNeeds, setShowNeeds] = useState(true)
  const [conceptOpen, setConceptOpen] = useState(() => Boolean(puzzle.concept && !progress.seenConcepts.includes(puzzle.key)))

  const compiled = useMemo(() => compile(level, source), [level, source])
  const success = isCompileSuccess(compiled) ? compiled : undefined
  // while the user is mid-typing, keep showing the last proof that compiled
  const [lastGood, setLastGood] = useState<CompileSuccess | undefined>(success)
  if (success && success !== lastGood) setLastGood(success)
  const shown = success ?? lastGood
  const trace = shown?.trace
  const stale = !success

  // manualCursor is set by the timeline. When it is null, the board follows the editor cursor.
  const lastCursor = trace ? trace.states.length - 1 : 0
  const caretCursor = cursorForCaret(trace, shown?.theoremLine ?? 0, caretLine)
  const cursor = Math.max(0, Math.min(manualCursor ?? caretCursor, lastCursor))
  const board = trace?.states[cursor] ?? level.start
  const finalBoard = trace?.states[lastCursor] ?? level.start
  const differing = boardDifferenceIndices(board, level.target)
  const failedAt = trace?.failedAt
  const showingFailure = Boolean(failedAt && cursor === failedAt.stepIndex)
  const errorIndices = showingFailure ? failedAt?.diagnostic.error?.indices ?? [] : []
  const motion = getBlockMotionState(puzzle.key, level.start, trace, cursor)
  const solved = Boolean(success?.trace.solved)
  const isPlaying = playing && Boolean(trace) && cursor < lastCursor

  const messages = useMemo<InfoMessage[]>(() => {
    const list: InfoMessage[] = []
    if (!isCompileSuccess(compiled)) {
      list.push({ line: compiled.diagnostic.line, text: describeDiagnostic(compiled.diagnostic), severity: 'error' })
    }
    const result = success
    if (result?.trace.failedAt) {
      const { diagnostic, stepIndex } = result.trace.failedAt
      const before = result.trace.states[stepIndex]
      const text = diagnostic.error ? describeMoveError(diagnostic.error, before) : diagnostic.message
      list.push({ line: diagnostic.line, text: `illegal move: ${text}`, severity: 'error' })
    }
    const warnings = isCompileSuccess(compiled) ? compiled.warnings : compiled.warnings ?? []
    for (const warning of warnings) list.push({ line: warning.line, text: warning.message, severity: 'warning' })
    if (result && !result.trace.failedAt && !result.trace.solved && !result.usesSorry) {
      const left = result.trace.distance[result.trace.distance.length - 1]
      list.push({ line: lastLine(source), text: `not solved yet: ${left} ${left === 1 ? 'block does' : 'blocks do'} not match the target`, severity: 'info' })
    }
    return list.sort((a, b) => a.line - b.line)
  }, [compiled, success, source])

  const editorMessages = useMemo<EditorMessage[]>(
    () => messages.filter((message) => message.severity !== 'info').map((message) => ({
      line: message.line,
      message: message.text,
      severity: message.severity === 'error' ? 'error' : 'warning',
    })),
    [messages],
  )
  const notes = useMemo(() => lineNotes(success?.trace), [success])
  const executedLine = cursor > 0 ? trace?.steps[cursor - 1]?.line : undefined
  const failingLine = isCompileSuccess(compiled) ? failedAt?.diagnostic.line : compiled.diagnostic.line

  const editSource = useCallback((next: string) => {
    setSource(next)
    setPlaying(false)
    onProgress((current) => saveDraft(current, puzzle.key, next))
  }, [onProgress, puzzle.key])

  const handleCaret = useCallback((line: number) => {
    setCaretLine(line)
    setManualCursor(null)
  }, [])

  const seek = useCallback((next: number) => {
    setPlaying(false)
    setManualCursor(Math.max(0, Math.min(next, lastCursor)))
  }, [lastCursor])

  const play = useCallback(() => {
    if (!trace || trace.steps.length === 0) return
    setManualCursor(0)
    setPlaying(true)
    setCelebrated(null)
  }, [trace])

  // playback
  useEffect(() => {
    if (!isPlaying || !trace) return
    const timer = window.setTimeout(() => {
      const move = trace.steps[cursor]?.move
      if (move) sounds.move(move.kind)
      setManualCursor(cursor + 1)
    }, cursor === 0 ? 260 : PLAYBACK_MS)
    return () => window.clearTimeout(timer)
  }, [isPlaying, cursor, trace])

  // play the error sound once for each new error
  const failingKey = success?.trace.failedAt ? `${success.trace.failedAt.diagnostic.line}:${success.trace.failedAt.stepIndex}` : ''
  useEffect(() => {
    if (failingKey) sounds.error()
  }, [failingKey])

  // show the win screen once, after typing stops or playback ends
  const normalized = normalizeProof(source)
  useEffect(() => {
    if (!solved || !success || isPlaying || celebrated === normalized) return
    const timer = window.setTimeout(() => {
      const moves = success.trace.steps.length
      const stars = rateProof({ solved: true, moves, size: success.size }, level) as StarRating
      const previous = progress.bestStars[puzzle.key] ?? 0
      onProgress((current) => recordWin(current, puzzle.key, stars, source))
      setCelebrated(normalized)
      setQed({ stars, newBest: stars > previous, moves, size: success.size })
      setManualCursor(null)
      sounds.win()
      burstConfetti()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [solved, success, isPlaying, celebrated, normalized, level, onProgress, progress.bestStars, puzzle.key, source])

  function addTactic(tactic: string) {
    sounds.click()
    editSource(appendTactic(source, tactic))
    setSelected(undefined)
    setManualCursor(Number.MAX_SAFE_INTEGER)
  }

  function clickCell(index: number) {
    if (selected === undefined) {
      sounds.click()
      setSelected(index)
    } else if (selected === index) {
      setSelected(undefined)
    } else {
      addTactic(`swap ${Math.min(selected, index)} ${Math.max(selected, index)}`)
    }
  }

  function dismissConcept() {
    setConceptOpen(false)
    onProgress((current) => markConceptSeen(current, puzzle.key))
  }

  function reset() {
    if (source !== level.starterCode && !window.confirm('Reset this proof to the starting code?')) return
    editSource(level.starterCode)
    setHintLevel(0)
    setManualCursor(null)
  }

  function share() {
    const route = puzzle.share(encodeBase64Url(source))
    const url = `${window.location.origin}${window.location.pathname}${routeHref(route)}`
    void navigator.clipboard?.writeText(url).then(() => {
      setShareState('copied')
      window.setTimeout(() => setShareState('idle'), 1800)
    })
  }

  const suggestion = suggestMove(finalBoard, level.target)
  const leanName = puzzle.kind === 'level' ? `level${level.id}` : 'puzzle'
  const leanCode = useMemo(
    () => (leanOpen ? exportLean({ name: leanName, start: level.start, target: level.target, source }) : ''),
    [leanOpen, leanName, level, source],
  )
  const bestStars = progress.bestStars[puzzle.key] ?? 0

  return (
    <div className={`play-screen tint-${puzzle.kind === 'level' ? chapterTint(level.chapter) : puzzle.kind === 'custom' ? 'lime' : 'yellow'}`}>
      <header className="play-header">
        <div className="play-title">
          <a className="back-link" href="#/" aria-label="Back to all levels"><BackIcon size={22} /></a>
          <div>
            <p className="eyebrow">{puzzle.eyebrow}</p>
            <h1>{puzzle.title}</h1>
            <p className="story">{puzzle.story}</p>
          </div>
        </div>
        <div className="play-meta">
          <div className="par-card" title="Match the best score to get three stars">
            <Stars count={bestStars} size={22} />
            <span className="par-text">
              best: {level.par} {level.par === 1 ? 'move' : 'moves'}
              {level.parSize !== undefined && `, ${level.parSize} lines`}
              {level.maxLines !== undefined && ` · limit ${level.maxLines} lines`}
            </span>
          </div>
          <nav className="level-nav" aria-label="Level navigation">
            {puzzle.prev && <a className="icon-button" href={routeHref(puzzle.prev)} aria-label="Previous level"><ChevronLeftIcon size={22} /></a>}
            {puzzle.next && <a className="icon-button" href={routeHref(puzzle.next)} aria-label={puzzle.kind === 'random' ? 'New puzzle' : 'Next level'}><ChevronRightIcon size={22} /></a>}
          </nav>
        </div>
      </header>

      <main className="play-layout">
        <section className="board-panel" aria-label="Board">
          <div className="board-stage">
            <div className="stage-header">
              <h2>Board</h2>
              <span className={`distance-pill${differing.length === 0 ? ' is-done' : ''}`}>
                {differing.length === 0 ? 'matches the target' : `${differing.length} ${differing.length === 1 ? 'block' : 'blocks'} to fix`}
              </span>
            </div>
            <div className="board-frame">
              <BoardView
                board={board}
                blockIds={motion.blockIds}
                rotationDegrees={motion.rotationDegrees}
                animated
                errorIndices={errorIndices}
                differingIndices={differing}
                target={showNeeds ? level.target : undefined}
                selected={selected === undefined ? [] : [selected]}
                onCellClick={clickCell}
              />
            </div>
            <MoveBuilder board={finalBoard} selected={selected} onAdd={addTactic} onClear={() => setSelected(undefined)} />
            <Timeline trace={trace} cursor={cursor} playing={isPlaying} onSeek={seek} onPlay={play} onPause={() => setPlaying(false)} />
          </div>

          <div className="target-stage">
            <div className="stage-header">
              <h2>Target</h2>
              <label className="toggle">
                <input type="checkbox" checked={showNeeds} onChange={(event) => setShowNeeds(event.target.checked)} />
                <span>show what each block needs</span>
              </label>
            </div>
            <BoardView board={level.target} size="md" label="Target board" />
          </div>
        </section>

        <section className="proof-panel" aria-label="Proof">
          <AnimatePresence>
            {conceptOpen && puzzle.concept && <ConceptCard concept={puzzle.concept} onDismiss={dismissConcept} />}
          </AnimatePresence>

          <div className="editor-card">
            <div className="editor-toolbar">
              <span className="editor-title" id="proof-editor-label">
                <span className="file-dot" aria-hidden="true" />
                {leanName}.lean
              </span>
              <div className="toolbar-actions">
                {!conceptOpen && puzzle.concept && (
                  <button type="button" className="chip" onClick={() => setConceptOpen(true)}>New idea</button>
                )}
                <button type="button" className="chip" onClick={() => setHintLevel((current) => Math.min(current + 1, 3))}>
                  {hintLevel === 0 ? 'Hint' : 'More help'}
                </button>
                <button type="button" className="chip" onClick={() => setLeanOpen(true)}>Lean 4 <ExternalIcon size={14} /></button>
                <button type="button" className="chip chip-ghost" onClick={reset}>Reset</button>
                <button type="button" className="button button-primary button-small" onClick={play} disabled={!trace || trace.steps.length === 0}>
                  <PlayIcon size={14} /> Run
                </button>
              </div>
            </div>
            <Suspense fallback={<div className="proof-editor editor-loading" aria-hidden="true" />}>
              <Editor
                value={source}
                onChange={editSource}
                messages={editorMessages}
                notes={notes}
                executedLine={executedLine}
                failingLine={failingLine}
                allowHelpers={level.allowHelpers}
                allowLoops={level.allowLoops}
                onCaretLine={handleCaret}
                onRun={play}
                onStepForward={() => seek(cursor + 1)}
                onStepBack={() => seek(cursor - 1)}
              />
            </Suspense>
            {hintLevel > 0 && (
              <div className="hint-box" role="note">
                <p><strong>Hint:</strong> {level.hint}</p>
                {hintLevel >= 2 && (
                  suggestion ? (
                    <p>
                      From where your proof stops, try <code>{formatMove(suggestion)}</code>.{' '}
                      <button type="button" className="link-button" onClick={() => addTactic(formatMove(suggestion))}>Add it</button>
                    </p>
                  ) : (
                    <p>{trace?.failedAt ? 'Fix the illegal move first.' : 'Your proof already matches the target.'}</p>
                  )
                )}
                {hintLevel >= 3 && (
                  <details className="solution-reveal">
                    <summary>Show an answer</summary>
                    <pre><code>{level.solution}</code></pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <InfoView
            board={board}
            target={level.target}
            differing={differing}
            trace={trace}
            cursor={cursor}
            messages={messages}
            stale={stale}
            onJumpToStep={seek}
          />
          <SyntaxHelp allowHelpers={level.allowHelpers} allowLoops={level.allowLoops} />
        </section>
      </main>

      <QedDialog
        open={qed !== null}
        stars={qed?.stars ?? 0}
        newBest={qed?.newBest ?? false}
        moves={qed?.moves ?? 0}
        size={qed?.size ?? 0}
        par={level.par}
        parSize={level.parSize}
        hasNext={Boolean(puzzle.next)}
        nextLabel={puzzle.kind === 'random' ? 'New puzzle' : 'Next level'}
        onNext={() => puzzle.next && navigate(puzzle.next)}
        onClose={() => setQed(null)}
        onReplay={() => {
          setQed(null)
          play()
        }}
        onLean={() => {
          setQed(null)
          setLeanOpen(true)
        }}
        onShare={share}
        shareState={shareState}
      />
      <LeanDialog open={leanOpen} code={leanCode} fileName={`${leanName}.lean`} onClose={() => setLeanOpen(false)} />
    </div>
  )
}

function lastLine(source: string): number {
  const lines = source.split('\n')
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].split('--', 1)[0].trim()) return index
  }
  return 0
}
