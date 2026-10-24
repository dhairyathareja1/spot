import type { Board } from '../engine/types'

type BoardViewProps = {
  board: Board
  errorIndices?: number[]
}

export function BoardView({ board, errorIndices = [] }: BoardViewProps) {
  return (
    <div
      className="board-grid"
      role="grid"
      aria-label={`Board, ${board.rows} rows by ${board.cols} columns`}
      style={{
        gridTemplateColumns: `repeat(${board.cols}, var(--block-size))`,
        gridTemplateRows: `repeat(${board.rows}, var(--block-size))`,
      }}
    >
      {board.cells.map((block, index) => (
        <div
          className={`board-block color-${block.color}${errorIndices.includes(index) ? ' is-error' : ''}`}
          key={index}
          role="gridcell"
          aria-label={`Cell ${index}, ${block.color}, rotation ${block.rot * 90} degrees`}
        >
          <span className="block-index">{index}</span>
          <span
            className="block-rotation"
            aria-hidden="true"
            style={{ transform: `translate(-50%, -50%) rotate(${block.rot * 90}deg)` }}
          >
            ▲
          </span>
          <span className="block-icons" aria-hidden="true">
            {block.locked && <span>🔒</span>}
            {block.pinned && <span>📌</span>}
          </span>
        </div>
      ))}
    </div>
  )
}
