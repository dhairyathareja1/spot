import { COLORS, type Board, type Color } from '../engine/types'
import { blockColors } from './colors'
import { CloseIcon, TurnLeftIcon, TurnRightIcon } from './Icons'

type MoveBuilderProps = {
  board: Board
  selected?: number
  onAdd: (tactic: string) => void
  onClear: () => void
}

/** Click-to-prove: pick a block on the board and add a move without typing. */
export function MoveBuilder({ board, selected, onAdd, onClear }: MoveBuilderProps) {
  if (selected === undefined) {
    return <p className="builder-hint">Tip: click a block to make a move, or click two blocks to swap them.</p>
  }

  const block = board.cells[selected]
  if (!block) return null

  return (
    <div className="move-builder" role="toolbar" aria-label={`Moves for block ${selected}`}>
      <span className="builder-label">Block {selected}</span>
      <span className="builder-group" aria-label="Paint">
        {COLORS.filter((color) => color !== block.color).map((color: Color) => (
          <button
            key={color}
            type="button"
            className="builder-swatch"
            style={{ background: blockColors[color] }}
            onClick={() => onAdd(`paint ${selected} ${color}`)}
            aria-label={`paint ${selected} ${color}`}
            title={`paint ${selected} ${color}`}
          />
        ))}
      </span>
      <button type="button" className="chip" onClick={() => onAdd(`rotate ${selected}`)} title={`rotate ${selected}`}><TurnRightIcon size={15} /> turn right</button>
      <button type="button" className="chip" onClick={() => onAdd(`rotate ${selected} ccw`)} title={`rotate ${selected} ccw`}><TurnLeftIcon size={15} /> turn left</button>
      <span className="builder-or">or click another block to swap them</span>
      <button type="button" className="chip chip-ghost" onClick={onClear} aria-label="Cancel"><CloseIcon size={15} /></button>
    </div>
  )
}
