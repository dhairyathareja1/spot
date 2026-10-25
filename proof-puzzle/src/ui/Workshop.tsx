import { useMemo, useState } from 'react'
import { boardDistance } from '../engine/applyMove'
import { formatMove, solveGreedy } from '../engine/solver'
import { COLORS, type Block, type Board, type Color } from '../engine/types'
import { BoardView } from './BoardView'
import { blockColors } from './colors'
import { ArrowRightIcon, BackIcon, CheckIcon } from './Icons'
import { emptyBoard } from './puzzles'
import { navigate, routeHref } from './router'
import { decodePuzzle, encodePuzzle, type CustomPuzzle } from './share'

type Tool = { kind: 'paint'; color: Color } | { kind: 'rotate' } | { kind: 'lock' } | { kind: 'pin' } | { kind: 'fix' }

const starter: CustomPuzzle = {
  name: 'My puzzle',
  start: emptyBoard(2, 3),
  target: emptyBoard(2, 3),
  allowHelpers: true,
  allowLoops: true,
}

export function Workshop({ data }: { data?: string }) {
  const [puzzle, setPuzzle] = useState<CustomPuzzle>(() => (data && decodePuzzle(data)) || starter)
  const [tool, setTool] = useState<Tool>({ kind: 'paint', color: 'teal' })
  const [copied, setCopied] = useState(false)

  const solution = useMemo(() => solveGreedy(puzzle.start, puzzle.target), [puzzle.start, puzzle.target])
  const distance = boardDistance(puzzle.start, puzzle.target)
  const encoded = encodePuzzle(puzzle)
  const playable = distance > 0 && solution !== undefined

  function resize(rows: number, cols: number) {
    const resizeBoard = (board: Board) => {
      const next = emptyBoard(rows, cols)
      const cells = next.cells.map((cell, index) => {
        const row = Math.floor(index / cols)
        const col = index % cols
        return row < board.rows && col < board.cols ? board.cells[row * board.cols + col] : cell
      })
      return { ...next, cells }
    }
    setPuzzle((current) => ({ ...current, start: resizeBoard(current.start), target: resizeBoard(current.target) }))
  }

  function apply(which: 'start' | 'target', index: number) {
    setPuzzle((current) => {
      const board = current[which]
      const cells = board.cells.slice()
      cells[index] = applyTool(cells[index], tool)
      const updated = { ...board, cells }
      // Flags describe the block itself, so they travel to the other board too.
      if (tool.kind === 'lock' || tool.kind === 'pin' || tool.kind === 'fix') {
        const other = which === 'start' ? 'target' : 'start'
        const otherCells = current[other].cells.slice()
        otherCells[index] = { ...otherCells[index], locked: cells[index].locked, pinned: cells[index].pinned, canRotate: cells[index].canRotate }
        return { ...current, [which]: updated, [other]: { ...current[other], cells: otherCells } }
      }
      return { ...current, [which]: updated }
    })
  }

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}${routeHref({ screen: 'custom', data: encoded })}`
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <div className="workshop tint-lime">
      <header className="play-header">
        <div className="play-title">
          <a className="back-link" href="#/" aria-label="Back to all levels"><BackIcon size={22} /></a>
          <div>
            <p className="eyebrow">Workshop</p>
            <h1>Make a puzzle</h1>
            <p className="story">Draw a start board and a target board, then share the link. Anyone with the link can play it.</p>
          </div>
        </div>
      </header>

      <div className="workshop-layout">
        <aside className="workshop-panel">
          <label className="field">
            <span>Name</span>
            <input value={puzzle.name} maxLength={40} onChange={(event) => setPuzzle({ ...puzzle, name: event.target.value })} />
          </label>
          <div className="field-row">
            <Stepper label="Rows" value={puzzle.start.rows} min={1} max={5} onChange={(rows) => resize(rows, puzzle.start.cols)} />
            <Stepper label="Columns" value={puzzle.start.cols} min={1} max={6} onChange={(cols) => resize(puzzle.start.rows, cols)} />
          </div>

          <div className="field">
            <span>Tool</span>
            <div className="tool-grid" role="radiogroup" aria-label="Tool">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={tool.kind === 'paint' && tool.color === color}
                  className={`tool-swatch${tool.kind === 'paint' && tool.color === color ? ' is-active' : ''}`}
                  style={{ background: blockColors[color] }}
                  onClick={() => setTool({ kind: 'paint', color })}
                  aria-label={`Paint ${color}`}
                  title={color}
                />
              ))}
              {([['rotate', 'turn'], ['lock', 'lock'], ['pin', 'pin'], ['fix', 'no turning']] as const).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={tool.kind === kind}
                  className={`chip${tool.kind === kind ? ' is-active' : ''}`}
                  onClick={() => setTool({ kind })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="toggle">
            <input type="checkbox" checked={puzzle.allowHelpers} onChange={(event) => setPuzzle({ ...puzzle, allowHelpers: event.target.checked })} />
            <span>Allow helpers (def)</span>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={puzzle.allowLoops} onChange={(event) => setPuzzle({ ...puzzle, allowLoops: event.target.checked })} />
            <span>Allow loops (for)</span>
          </label>
          <label className="field">
            <span>Line limit (optional)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={puzzle.maxLines ?? ''}
              onChange={(event) => {
                const value = Number(event.target.value)
                setPuzzle({ ...puzzle, maxLines: value > 0 ? value : undefined })
              }}
            />
          </label>

          <div className={`solver-report${playable ? ' is-ok' : ''}`}>
            {distance === 0
              ? 'The start and target are the same. Change the target.'
              : solution
                ? <>The computer solved it in <strong>{solution.length} moves</strong> ({solution.slice(0, 3).map(formatMove).join(', ')}{solution.length > 3 ? ', and more' : ''}).</>
                : 'The computer could not solve it. Check your locked and pinned blocks.'}
          </div>

          <div className="workshop-actions">
            <button type="button" className="button button-primary" disabled={!playable} onClick={() => navigate({ screen: 'custom', data: encoded })}>Play it <ArrowRightIcon /></button>
            <button type="button" className="button" disabled={!playable} onClick={copyLink}>{copied ? <><CheckIcon /> Copied</> : 'Copy link'}</button>
          </div>
        </aside>

        <section className="workshop-boards">
          <div className="workshop-board">
            <div className="stage-header">
              <h2>Start</h2>
              <button type="button" className="chip" onClick={() => setPuzzle({ ...puzzle, start: puzzle.target })}>same as target</button>
            </div>
            <BoardView board={puzzle.start} onCellClick={(index) => apply('start', index)} label="Start board editor" />
          </div>
          <div className="workshop-board">
            <div className="stage-header">
              <h2>Target</h2>
              <button type="button" className="chip" onClick={() => setPuzzle({ ...puzzle, target: puzzle.start })}>same as start</button>
            </div>
            <BoardView board={puzzle.target} onCellClick={(index) => apply('target', index)} label="Target board editor" />
          </div>
        </section>
      </div>
    </div>
  )
}

function applyTool(block: Block, tool: Tool): Block {
  switch (tool.kind) {
    case 'paint':
      return { ...block, color: tool.color }
    case 'rotate':
      return { ...block, rot: ((block.rot + 1) % 4) as Block['rot'] }
    case 'lock':
      return { ...block, locked: !block.locked }
    case 'pin':
      return { ...block, pinned: !block.pinned }
    case 'fix':
      return { ...block, canRotate: !block.canRotate }
  }
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="field stepper">
      <span>{label}</span>
      <div>
        <button type="button" className="icon-button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}>-</button>
        <output>{value}</output>
        <button type="button" className="icon-button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  )
}
