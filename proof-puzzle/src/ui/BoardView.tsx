import { motion } from 'framer-motion'
import type { Block, Board } from '../engine/types'
import { blockColors, blockSize } from './colors'

type BoardViewProps = {
  board: Board
  blockIds?: readonly string[]
  rotationDegrees?: readonly number[]
  errorIndices?: number[]
  differingIndices?: number[]
  /** When set, differing cells show a small chip with the color and facing they need. */
  target?: Board
  animated?: boolean
  size?: 'lg' | 'md' | 'sm'
  showLabels?: boolean
  selected?: number[]
  onCellClick?: (index: number) => void
  label?: string
}

export function BoardView({
  board,
  blockIds,
  rotationDegrees,
  errorIndices = [],
  differingIndices = [],
  target,
  animated = false,
  size = 'lg',
  showLabels = false,
  selected = [],
  onCellClick,
  label,
}: BoardViewProps) {
  const errors = new Set(errorIndices)
  const differences = new Set(differingIndices)
  const pixels = blockSize(board, size)
  const compact = size === 'sm'

  return (
    <div
      className={`board-grid board-${size}${onCellClick ? ' is-interactive' : ''}`}
      role="grid"
      aria-label={label ?? `Board, ${board.rows} rows by ${board.cols} columns`}
      style={{
        ['--cols' as string]: board.cols,
        ['--rows' as string]: board.rows,
        ['--block-base' as string]: `${pixels}px`,
      }}
    >
      {board.cells.map((block, index) => {
        const blockId = blockIds?.[index] ?? `cell-${index}`
        const rotation = rotationDegrees?.[index] ?? block.rot * 90
        const isError = errors.has(index)
        const isDifferent = differences.has(index)
        const want = isDifferent ? target?.cells[index] : undefined
        const classes = [
          'board-block',
          isDifferent ? 'is-different' : '',
          isError ? 'is-error' : '',
          selected.includes(index) ? 'is-selected' : '',
        ].filter(Boolean).join(' ')
        const content = (
          <>
            {!compact && <span className="block-index">{index}</span>}
            <span className="block-rotation-anchor" aria-hidden="true">
              <motion.span
                className="block-rotation"
                initial={false}
                animate={{ rotate: rotation }}
                transition={{ rotate: { duration: animated ? 0.32 : 0, ease: [0.4, 0, 0.2, 1] } }}
              >
                <Arrow />
              </motion.span>
            </span>
            {showLabels && !compact && <span className="block-label" aria-hidden="true">{block.color[0].toUpperCase()}</span>}
            {!compact && <BlockFlags block={block} />}
            {want && !compact && (
              <span
                className="block-want"
                title={`needs ${want.color}, facing ${want.rot * 90}°`}
                style={{ background: blockColors[want.color] }}
                aria-hidden="true"
              >
                <span style={{ transform: `rotate(${want.rot * 90}deg)` }}><Arrow /></span>
              </span>
            )}
            {isError && <span className="block-error-mark" aria-hidden="true">✕</span>}
          </>
        )

        return (
          <motion.div
            className="board-cell"
            key={blockId}
            layout={animated ? 'position' : false}
            transition={{ layout: { duration: 0.42, ease: [0.4, 0, 0.2, 1] } }}
            role="gridcell"
            aria-label={`Cell ${index}, ${block.color}, facing ${block.rot * 90} degrees${block.locked ? ', locked' : ''}${block.pinned ? ', pinned' : ''}${block.canRotate ? '' : ', cannot rotate'}${isError ? ', illegal move' : ''}`}
          >
            <motion.div
              className={classes}
              initial={false}
              animate={{
                backgroundColor: isError ? '#dc2626' : blockColors[block.color],
                x: animated && isError ? [0, -7, 7, -5, 5, 0] : 0,
              }}
              transition={{ backgroundColor: { duration: animated ? 0.25 : 0 }, x: { duration: 0.35 } }}
              style={{ ['--block-color' as string]: blockColors[block.color] }}
            >
              {onCellClick ? (
                <button
                  type="button"
                  className="block-button"
                  onClick={() => onCellClick(index)}
                  aria-label={`Block ${index}: ${block.color}. Click to add a move.`}
                >
                  {content}
                </button>
              ) : content}
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <path d="M12 3 L20 15 H15 V21 H9 V15 H4 Z" fill="currentColor" />
    </svg>
  )
}

function BlockFlags({ block }: { block: Block }) {
  if (!block.locked && !block.pinned && block.canRotate) return null
  return (
    <span className="block-flags" aria-hidden="true">
      {block.locked && (
        <svg viewBox="0 0 24 24" className="flag-icon" aria-label="locked">
          <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.5" fill="none" />
        </svg>
      )}
      {block.pinned && (
        <svg viewBox="0 0 24 24" className="flag-icon" aria-label="pinned">
          <circle cx="12" cy="8" r="5" fill="currentColor" />
          <path d="M12 12v10" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      )}
      {!block.canRotate && (
        <svg viewBox="0 0 24 24" className="flag-icon" aria-label="cannot rotate">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <path d="M6 18 L18 6" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      )}
    </span>
  )
}
