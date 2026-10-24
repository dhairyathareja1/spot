import { COLORS, type Block, type Board, type Color, type Rotation } from './types'

const colorCodes: Record<string, Color> = { b: 'blue', g: 'green', y: 'yellow', p: 'purple', o: 'orange', t: 'teal' }
const rotationCodes: Record<string, Rotation> = { '^': 0, '>': 1, v: 2, '<': 3 }

export function makeBlock(color: Color, overrides: Partial<Block> = {}): Block {
  return { color, rot: 0, locked: false, canRotate: true, pinned: false, ...overrides }
}

export function makeBoard(rows: number, cols: number, cells: Block[]): Board {
  if (cells.length !== rows * cols) {
    throw new Error(`board needs ${rows * cols} cells, got ${cells.length}`)
  }
  return { rows, cols, cells }
}

/**
 * Compact board notation, one string per row: a color letter (b g y p o t) optionally
 * followed by a facing (^ > v <) and flags (* locked, ! pinned, # cannot rotate).
 */
export function grid(rows: string[]): Board {
  const parsedRows = rows.map((row) => row.trim().split(/\s+/).map(parseBlockCode))
  const cols = parsedRows[0]?.length ?? 0
  if (parsedRows.some((row) => row.length !== cols)) throw new Error('every row needs the same width')
  return makeBoard(parsedRows.length, cols, parsedRows.flat())
}

export function toGrid(board: Board): string[] {
  const rows: string[] = []
  for (let row = 0; row < board.rows; row += 1) {
    rows.push(board.cells.slice(row * board.cols, (row + 1) * board.cols).map(blockCode).join(' '))
  }
  return rows
}

function parseBlockCode(code: string): Block {
  const color = colorCodes[code[0]]
  if (!color) throw new Error(`unknown block code: ${code}`)
  const block = makeBlock(color)
  for (const flag of code.slice(1)) {
    if (flag in rotationCodes) block.rot = rotationCodes[flag]
    else if (flag === '*') block.locked = true
    else if (flag === '!') block.pinned = true
    else if (flag === '#') block.canRotate = false
    else throw new Error(`unknown block flag in ${code}`)
  }
  return block
}

function blockCode(block: Block): string {
  const facing = Object.entries(rotationCodes).find(([, rot]) => rot === block.rot)?.[0] ?? '^'
  return [
    block.color[0],
    block.rot === 0 ? '' : facing,
    block.locked ? '*' : '',
    block.pinned ? '!' : '',
    block.canRotate ? '' : '#',
  ].join('')
}

export function sameFace(a: Block | undefined, b: Block | undefined): boolean {
  return Boolean(a && b && a.color === b.color && a.rot === b.rot)
}

export function cellLabel(index: number, board: Pick<Board, 'cols'>): string {
  return `row ${Math.floor(index / board.cols) + 1}, column ${(index % board.cols) + 1}`
}

export const colorCodeOf = (color: Color) => color[0]

export const ALL_COLORS: readonly Color[] = COLORS
