import type { Board, Color } from '../engine/types'

export const blockColors: Record<Color, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  teal: '#14b8a6',
}

export function blockSize(board: Board, size: 'lg' | 'md' | 'sm'): number {
  const base = board.cols >= 8 ? 54 : board.cols >= 6 ? 62 : board.cols >= 4 ? 72 : 84
  if (size === 'sm') return Math.round(base * 0.42)
  if (size === 'md') return Math.round(base * 0.72)
  return base
}
