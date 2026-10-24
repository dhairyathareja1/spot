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

export type ParameterType = 'Nat' | 'Color'

export type HelperParameter = { name: string; type: ParameterType }

export type ProofStatement = { name: string; args: string[]; line: number }

export type HelperDefinition = {
  name: string
  parameters: HelperParameter[]
  body: ProofStatement[]
  line: number
}

export type ParsedProof = { helpers: HelperDefinition[]; body: ProofStatement[] }

export type ResolvedValue =
  | { kind: 'literal'; type: 'Nat'; value: number }
  | { kind: 'literal'; type: 'Color'; value: Color }
  | { kind: 'parameter'; type: ParameterType; name: string }

export type ResolvedMove =
  | { kind: 'swap'; a: ResolvedValue; b: ResolvedValue }
  | { kind: 'paint'; i: ResolvedValue; color: ResolvedValue }
  | { kind: 'rotate'; i: ResolvedValue; dir: 'cw' | 'ccw' }

export type ResolvedStatement =
  | { kind: 'move'; move: ResolvedMove; line: number }
  | { kind: 'call'; name: string; args: ResolvedValue[]; line: number }
  | { kind: 'sorry'; line: number }

export type ResolvedHelper = {
  name: string
  parameters: HelperParameter[]
  body: ResolvedStatement[]
  line: number
}

export type ResolvedProof = {
  helpers: ResolvedHelper[]
  body: ResolvedStatement[]
}

export type Diagnostic = {
  kind: 'parse' | 'name' | 'arity' | 'type' | 'level' | 'limit' | 'move'
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
