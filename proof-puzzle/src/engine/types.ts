export type Color = 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'teal'

export type Block = {
  color: Color
  rot: 0 | 1 | 2 | 3
  locked: boolean
  canRotate: boolean
  pinned: boolean
}

export type Board = {
  rows: number
  cols: number
  cells: readonly Block[]
}

export type Level = {
  id: number
  title: string
  story: string
  start: Board
  target: Board
  par: number
  allowHelpers: boolean
  maxLines?: number
  starterCode: string
  hint: string
}

export type Move =
  | { kind: 'swap'; a: number; b: number }
  | { kind: 'paint'; i: number; color: Color }
  | { kind: 'rotate'; i: number; dir: 'cw' | 'ccw' }

export type MoveError = {
  code:
    | 'OUT_OF_BOUNDS'
    | 'SWAP_SAME'
    | 'PINNED'
    | 'LOCKED'
    | 'NOT_ROTATABLE'
    | 'ALREADY_COLOR'
  indices: number[]
}

export type Step = { move: Move; line: number; callStack: string[] }

export type Diagnostic = {
  kind: 'parse' | 'name' | 'arity' | 'move'
  line: number
  message: string
  error?: MoveError
}

export type Trace = {
  steps: Step[]
  states: Board[]
  distance: number[]
  solved: boolean
  failedAt?: { stepIndex: number; diagnostic: Diagnostic }
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })
