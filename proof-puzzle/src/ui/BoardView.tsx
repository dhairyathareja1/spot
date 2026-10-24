import { motion } from 'framer-motion'
import type { Board, Color } from '../engine/types'

type BoardViewProps = {
  board: Board
  blockIds?: readonly string[]
  rotationDegrees?: readonly number[]
  errorIndices?: number[]
  differingIndices?: number[]
  animated?: boolean
}

const blockColors: Record<Color, string> = {
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#ca8a04',
  purple: '#9333ea',
  orange: '#ea580c',
  teal: '#0f766e',
}

export function BoardView({
  board,
  blockIds,
  rotationDegrees,
  errorIndices = [],
  differingIndices = [],
  animated = false,
}: BoardViewProps) {
  const errors = new Set(errorIndices)
  const differences = new Set(differingIndices)

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
      {board.cells.map((block, index) => {
        const blockId = blockIds?.[index] ?? `cell-${index}`
        const rotation = rotationDegrees?.[index] ?? block.rot * 90
        const isError = errors.has(index)

        return (
          <motion.div
            className="board-cell"
            key={blockId}
            layout={animated ? 'position' : false}
            transition={{ layout: { duration: 0.4, ease: 'easeInOut' } }}
            role="gridcell"
            aria-label={`Cell ${index}, ${block.color}, rotation ${block.rot * 90} degrees`}
          >
            <motion.div
              className={`board-block color-${block.color}${differences.has(index) ? ' is-different' : ''}${isError ? ' is-error' : ''}`}
              initial={false}
              animate={{
                backgroundColor: blockColors[block.color],
                x: animated && isError ? [0, -7, 7, -5, 5, 0] : 0,
              }}
              transition={{
                backgroundColor: { duration: animated ? 0.25 : 0 },
                x: { duration: 0.3 },
              }}
            >
              <span className="block-index">{index}</span>
              <span className="block-rotation-anchor" aria-hidden="true">
                <motion.span
                  className="block-rotation"
                  initial={false}
                  animate={{ rotate: rotation }}
                  transition={{ rotate: { duration: animated ? 0.3 : 0, ease: 'easeInOut' } }}
                >
                  ▲
                </motion.span>
              </span>
              <span className="block-icons" aria-hidden="true">
                {block.locked && <span>🔒</span>}
                {block.pinned && <span>📌</span>}
              </span>
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}
