export const COLORS = ['blue', 'green', 'yellow', 'purple', 'orange', 'teal'] as const

export type Color = (typeof COLORS)[number]

export type Rotation = 0 | 1 | 2 | 3

export type Block = {
  color: Color
  rot: Rotation
  locked: boolean
  canRotate: boolean
  pinned: boolean
}

export type Board = {
  rows: number
  cols: number
  cells: readonly Block[]
}

export type Concept = {
  title: string
  body: string
  example: string
}

export type Level = {
  id: number
  chapter: number
  title: string
  story: string
  start: Board
  target: Board
  // moves in the solution
  par: number
  // lines in the solution, only for helper and loop levels
  parSize?: number
  allowHelpers: boolean
  allowLoops: boolean
  maxLines?: number
  starterCode: string
  hint: string
  solution: string
  concept?: Concept
}

export type Move =
  | { kind: 'swap'; a: number; b: number }
  | { kind: 'paint'; i: number; color: Color }
  | { kind: 'rotate'; i: number; dir: 'cw' | 'ccw' }

export type MoveErrorCode =
  | 'OUT_OF_BOUNDS'
  | 'SWAP_SAME'
  | 'PINNED'
  | 'LOCKED'
  | 'NOT_ROTATABLE'
  | 'ALREADY_COLOR'

export type MoveError = {
  code: MoveErrorCode
  indices: number[]
}

export type Step = {
  move: Move
  // line of the move itself
  line: number
  // theorem line this move came from
  origin: number
  callStack: string[]
}

export type ParameterType = 'Nat' | 'Color'

export type BinaryOperator = '+' | '-' | '*' | '/' | '%'

export type Expr =
  | { kind: 'nat'; value: number }
  | { kind: 'color'; value: Color }
  | { kind: 'var'; name: string }
  | { kind: 'binop'; op: BinaryOperator; left: Expr; right: Expr }

export type LoopSource =
  | { kind: 'range'; start: Expr; stop: Expr; step?: Expr }
  | { kind: 'list'; items: Expr[] }

export type Statement =
  | { kind: 'tactic'; name: string; args: Expr[]; line: number }
  | { kind: 'for'; variable: string; source: LoopSource; body: Statement[]; line: number }
  | { kind: 'sorry'; line: number }

export type HelperParameter = { name: string; type: ParameterType }

export type HelperDefinition = {
  name: string
  parameters: HelperParameter[]
  body: Statement[]
  line: number
}

export type ParsedProof = {
  helpers: HelperDefinition[]
  theorem: { name: string; line: number }
  body: Statement[]
}

export type ResolvedStatement =
  | { kind: 'swap'; a: Expr; b: Expr; line: number }
  | { kind: 'paint'; i: Expr; color: Expr; line: number }
  | { kind: 'rotate'; i: Expr; dir: 'cw' | 'ccw'; line: number }
  | { kind: 'call'; name: string; args: Expr[]; line: number }
  | {
      kind: 'for'
      variable: string
      variableType: ParameterType
      source: LoopSource
      body: ResolvedStatement[]
      line: number
    }
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

export type DiagnosticKind = 'parse' | 'name' | 'arity' | 'type' | 'level' | 'limit' | 'move'

export type Diagnostic = {
  kind: DiagnosticKind
  line: number
  message: string
  error?: MoveError
}

export type Warning = {
  line: number
  message: string
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

export function isColor(value: string): value is Color {
  return (COLORS as readonly string[]).includes(value)
}
