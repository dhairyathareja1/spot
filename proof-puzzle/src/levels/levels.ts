import { grid } from '../engine/board'
import { compile, isCompileSuccess } from '../engine/compile'
import type { Board, Concept, Level } from '../engine/types'

export type Chapter = {
  id: number
  title: string
  tagline: string
}

export const chapters: Chapter[] = [
  { id: 1, title: 'Tactics', tagline: 'Every line is a move. Swap, paint and rotate your way to the goal.' },
  { id: 2, title: 'Definitions', tagline: 'Name a pattern once with def, then call it like a function.' },
  { id: 3, title: 'Iteration', tagline: 'Loops, ranges and arithmetic. Short proofs for big boards.' },
]

type LevelSpec = {
  id: number
  chapter: number
  title: string
  story: string
  start: Board
  solution: string
  hint: string
  maxLines?: number
  concept?: Concept
}

export function starterCode(id: number): string {
  return `theorem level${id} : Solve start target := by\n  sorry\n`
}

/**
 * A level's target is whatever its reference solution produces, so every level is solvable by
 * construction and par always matches a real proof.
 */
function defineLevel(spec: LevelSpec): Level {
  const allowHelpers = spec.chapter >= 2
  const allowLoops = spec.chapter >= 3
  const result = compile(
    { start: spec.start, target: spec.start, allowHelpers, allowLoops },
    spec.solution,
  )
  if (!isCompileSuccess(result) || result.trace.failedAt) {
    throw new Error(`level ${spec.id} has an invalid reference solution`)
  }

  const { trace, size } = result
  return {
    id: spec.id,
    chapter: spec.chapter,
    title: spec.title,
    story: spec.story,
    start: spec.start,
    target: trace.states[trace.states.length - 1],
    par: trace.steps.length,
    ...(spec.chapter >= 2 ? { parSize: size } : {}),
    allowHelpers,
    allowLoops,
    ...(spec.maxLines !== undefined ? { maxLines: spec.maxLines } : {}),
    starterCode: starterCode(spec.id),
    hint: spec.hint,
    solution: spec.solution,
    ...(spec.concept ? { concept: spec.concept } : {}),
  }
}

const proof = (id: number, ...lines: string[]) =>
  [`theorem level${id} : Solve start target := by`, ...lines.map((line) => `  ${line}`)].join('\n')

const helperProof = (id: number, helpers: string[], ...lines: string[]) =>
  [...helpers, proof(id, ...lines)].join('\n')

export const levels: Level[] = [
  defineLevel({
    id: 1,
    chapter: 1,
    title: 'First Steps',
    story: 'Two blocks are in each other\'s seats and the last one is the wrong color.',
    start: grid(['b g y']),
    solution: proof(1, 'swap 0 1', 'paint 2 purple'),
    hint: 'Swap blocks 0 and 1, then paint block 2 purple.',
    concept: {
      title: 'A proof is a list of moves',
      body: 'Replace sorry with tactics, one per line. The board updates as you type, and the level is cleared when the board matches the target.',
      example: 'theorem level1 : Solve start target := by\n  swap 0 1\n  paint 2 purple',
    },
  }),
  defineLevel({
    id: 2,
    chapter: 1,
    title: 'Spin',
    story: 'The arrow on each block shows which way it faces.',
    start: grid(['b g y']),
    solution: proof(2, 'rotate 0', 'paint 1 teal'),
    hint: 'Rotate block 0 clockwise, then paint block 1 teal.',
    concept: {
      title: 'rotate turns a block 90°',
      body: 'Every block has a facing. rotate i turns block i a quarter turn clockwise.',
      example: 'rotate 0',
    },
  }),
  defineLevel({
    id: 3,
    chapter: 1,
    title: 'Swap Meet',
    story: 'Turn the whole row around in as few moves as possible.',
    start: grid(['b g y p']),
    solution: proof(3, 'swap 0 3', 'swap 1 2'),
    hint: 'The outer pair swaps, then the inner pair swaps.',
  }),
  defineLevel({
    id: 4,
    chapter: 1,
    title: 'Turn Back',
    story: 'Two blocks are facing the wrong way. One of them is only a quarter turn off.',
    start: grid(['b> g y<']),
    solution: proof(4, 'rotate 0 ccw', 'rotate 2'),
    hint: 'Block 0 needs a counterclockwise turn. Block 2 needs one more clockwise turn.',
    concept: {
      title: 'Counterclockwise',
      body: 'Add ccw to turn the other way. Three clockwise turns cost three moves, one ccw costs one.',
      example: 'rotate 0 ccw',
    },
  }),
  defineLevel({
    id: 5,
    chapter: 1,
    title: 'Pinned in Place',
    story: 'A pinned block cannot leave its seat, so you have to work around it.',
    start: grid(['b g! y p']),
    solution: proof(5, 'swap 0 2', 'paint 3 orange'),
    hint: 'Leave the pinned block alone and swap blocks 0 and 2.',
    concept: {
      title: 'Pinned blocks 📌',
      body: 'Pinned blocks can be painted and rotated, but swap fails if either block is pinned.',
      example: 'swap 0 2 -- skips the pin at 1',
    },
  }),
  defineLevel({
    id: 6,
    chapter: 1,
    title: 'Locked Paint',
    story: 'The locked block keeps its paint and facing, but it can still be carried.',
    start: grid(['b* g y o']),
    solution: proof(6, 'swap 0 2', 'paint 0 teal'),
    hint: 'Move the locked blue block with a swap, then repaint what lands at 0.',
    concept: {
      title: 'Locked blocks 🔒',
      body: 'Locked blocks cannot be painted or rotated. You can still swap them into place.',
      example: 'swap 0 2',
    },
  }),
  defineLevel({
    id: 7,
    chapter: 1,
    title: 'Grid Coordinates',
    story: 'Bigger boards are numbered left to right, then top to bottom.',
    start: grid(['b g', 'y p']),
    solution: proof(7, 'swap 0 3', 'paint 1 orange', 'rotate 2'),
    hint: 'Swap the corners 0 and 3, paint 1 orange and rotate 2.',
    concept: {
      title: 'Row-major indices',
      body: 'On a board with c columns, the block at row r and column k has index r × c + k. Hover a block to see its index.',
      example: '-- 2 × 2 board\n-- 0 1\n-- 2 3',
    },
  }),
  defineLevel({
    id: 8,
    chapter: 1,
    title: 'Three-Cycle',
    story: 'Every block wants the seat to its left. A cycle of three takes two swaps.',
    start: grid(['b g y']),
    solution: proof(8, 'swap 0 1', 'swap 1 2'),
    hint: 'Swap 0 and 1 first. Then block 1 is ready to trade with block 2.',
  }),
  defineLevel({
    id: 9,
    chapter: 1,
    title: 'Bolted Down',
    story: 'Blocks marked with a bar cannot rotate at all. Plan around them.',
    start: grid(['t o# b', 'b! y g>']),
    solution: proof(9, 'swap 0 2', 'rotate 5 ccw', 'paint 1 purple', 'rotate 4'),
    hint: 'Swap the corners on the top row, fix the facings on the bottom row, then repaint the bolted block.',
    concept: {
      title: 'Fixed blocks',
      body: 'A block with a bar instead of an arrow cannot rotate. You can still paint it and swap it.',
      example: 'paint 1 purple',
    },
  }),
  defineLevel({
    id: 10,
    chapter: 2,
    title: 'Your First def',
    story: 'The same two-move pattern repeats four times. Write it once.',
    start: grid(['b g b g b g b g']),
    solution: helperProof(
      10,
      ['def swapAndPaint (a b : Nat) (c : Color) := by', '  swap a b', '  paint a c'],
      'swapAndPaint 0 1 teal',
      'swapAndPaint 2 3 teal',
      'swapAndPaint 4 5 teal',
      'swapAndPaint 6 7 teal',
    ),
    maxLines: 6,
    hint: 'Define a helper with two Nat parameters and a Color parameter, then call it four times.',
    concept: {
      title: 'def names a pattern',
      body: 'A helper is a function from arguments to moves. Parameters are typed Nat or Color, and calls look like tactics.',
      example: 'def swapAndPaint (a b : Nat) (c : Color) := by\n  swap a b\n  paint a c\n\ntheorem level10 : Solve start target := by\n  swapAndPaint 0 1 teal',
    },
  }),
  defineLevel({
    id: 11,
    chapter: 2,
    title: 'Parameterized Turns',
    story: 'Apply the same pair operation at four different positions.',
    start: grid(['b g b g b g b g']),
    solution: helperProof(
      11,
      ['def swapAndRotate (a b : Nat) := by', '  swap a b', '  rotate a'],
      'swapAndRotate 0 1',
      'swapAndRotate 2 3',
      'swapAndRotate 4 5',
      'swapAndRotate 6 7',
    ),
    maxLines: 6,
    hint: 'Use Nat parameters to choose which pair each call changes.',
  }),
  defineLevel({
    id: 12,
    chapter: 2,
    title: 'Color Parameters',
    story: 'One reusable paint pattern, four different colors.',
    start: grid(['b b b b b b b b']),
    solution: helperProof(
      12,
      ['def paintPair (a b : Nat) (c : Color) := by', '  paint a c', '  paint b c'],
      'paintPair 0 1 purple',
      'paintPair 2 3 teal',
      'paintPair 4 5 orange',
      'paintPair 6 7 yellow',
    ),
    maxLines: 6,
    hint: 'Give the helper a Color parameter so each call can choose its paint.',
  }),
  defineLevel({
    id: 13,
    chapter: 2,
    title: 'Helpers in Layers',
    story: 'Two patterns share their first three moves. Build the bigger one from the smaller one.',
    start: grid(['b g b g p y p y']),
    solution: helperProof(
      13,
      [
        'def flip (a b : Nat) := by',
        '  swap a b',
        '  rotate a',
        '  rotate b ccw',
        'def flipPaint (a b : Nat) := by',
        '  flip a b',
        '  paint a orange',
      ],
      'flip 0 1',
      'flip 2 3',
      'flipPaint 4 5',
      'flipPaint 6 7',
    ),
    maxLines: 9,
    hint: 'A helper can call any helper defined above it. Let flipPaint call flip.',
    concept: {
      title: 'Helpers compose',
      body: 'Helpers can call earlier helpers, just like functions. Recursion is not allowed, so every proof terminates.',
      example: 'def flipPaint (a b : Nat) := by\n  flip a b\n  paint a orange',
    },
  }),
  defineLevel({
    id: 14,
    chapter: 2,
    title: 'Diagonal',
    story: 'Mark the diagonal of the grid: paint it yellow and give it a quarter turn.',
    start: grid(['b g b', 'g b g', 'b g b']),
    solution: helperProof(
      14,
      ['def mark (i : Nat) := by', '  paint i yellow', '  rotate i'],
      'mark 0',
      'mark 4',
      'mark 8',
    ),
    maxLines: 5,
    hint: 'On a 3 × 3 board the diagonal is 0, 4 and 8.',
  }),
  defineLevel({
    id: 15,
    chapter: 2,
    title: 'Drop Down',
    story: 'Each top block falls into the row below and takes a new coat of paint.',
    start: grid(['o> pv t<', 'b b b']),
    solution: helperProof(
      15,
      ['def drop (top : Nat) (c : Color) := by', '  swap top (top + 3)', '  paint (top + 3) c'],
      'drop 0 yellow',
      'drop 1 green',
      'drop 2 blue',
    ),
    maxLines: 5,
    hint: 'The block below index i is i + 3 on a three-column board. Arithmetic goes in parentheses.',
    concept: {
      title: 'Nat arithmetic',
      body: 'Arguments can be expressions: + - * / %. Like Lean, Nat subtraction stops at zero. Wrap expressions in parentheses.',
      example: 'swap top (top + 3)',
    },
  }),
  defineLevel({
    id: 16,
    chapter: 3,
    title: 'for Loops',
    story: 'Eight blocks, one color. Say it once.',
    start: grid(['g g g g g g g g']),
    solution: proof(16, 'for i in [0:8] do paint i teal'),
    maxLines: 2,
    hint: 'A range [0:8] counts 0, 1, … 7.',
    concept: {
      title: 'for loops',
      body: 'for i in [a:b] do runs its body for every i from a up to, but not including, b. A loop and its body count as two lines.',
      example: 'for i in [0:8] do\n  paint i teal',
    },
  }),
  defineLevel({
    id: 17,
    chapter: 3,
    title: 'Stride',
    story: 'Only every other block needs a turn.',
    start: grid(['b g b g b g b g']),
    solution: proof(17, 'for i in [0:8:2] do rotate i'),
    maxLines: 2,
    hint: 'A third number in the range is the step: [0:8:2].',
    concept: {
      title: 'Steps',
      body: 'Add a step to the range to skip ahead. [0:8:2] counts 0, 2, 4, 6.',
      example: 'for i in [0:8:2] do rotate i',
    },
  }),
  defineLevel({
    id: 18,
    chapter: 3,
    title: 'Mirror',
    story: 'Reverse a row of eight. The partner of block i sits at 7 - i.',
    start: grid(['b g y p o t b g']),
    solution: proof(18, 'for i in [0:4] do swap i (7 - i)'),
    maxLines: 2,
    hint: 'Loop over the first half and swap each block with its mirror image.',
  }),
  defineLevel({
    id: 19,
    chapter: 3,
    title: 'Scattered',
    story: 'The blocks to paint follow no pattern. List them.',
    start: grid(['b b b b b b b b']),
    solution: proof(19, 'for i in [0, 3, 5, 6] do paint i orange'),
    maxLines: 2,
    hint: 'Loops can run over a list: [0, 3, 5, 6].',
    concept: {
      title: 'Lists',
      body: 'A loop can walk an explicit list of values instead of a range. Lists of colors work too.',
      example: 'for i in [0, 3, 5, 6] do paint i orange',
    },
  }),
  defineLevel({
    id: 20,
    chapter: 3,
    title: 'Nested Loops',
    story: 'Paint the 2 × 2 heart of a 4 × 4 board.',
    start: grid(['g g g g', 'g g g g', 'g g g g', 'g g g g']),
    solution: proof(20, 'for r in [1:3] do', '  for c in [1:3] do', '    paint (r * 4 + c) purple'),
    maxLines: 3,
    hint: 'Loop over rows and columns. The block at row r and column c is r * 4 + c.',
    concept: {
      title: 'Nesting',
      body: 'Indent a loop body under do to give it several lines, or to nest another loop inside.',
      example: 'for r in [1:3] do\n  for c in [1:3] do\n    paint (r * 4 + c) purple',
    },
  }),
  defineLevel({
    id: 21,
    chapter: 3,
    title: 'Checkmate',
    story: 'A full checkerboard of turned teal tiles. Combine everything you know.',
    start: grid(['b b b b', 'b b b b', 'b b b b', 'b b b b']),
    solution: helperProof(
      21,
      ['def tile (i : Nat) := by', '  paint i teal', '  rotate i'],
      'for r in [0:4] do',
      '  for c in [0:2] do',
      '    tile (r * 4 + c * 2 + r % 2)',
    ),
    maxLines: 5,
    hint: 'Each row has two tiles. Shift odd rows by one with r % 2.',
  }),
]

export function findLevel(id: number): Level | undefined {
  return levels.find((level) => level.id === id)
}

export function levelsInChapter(chapter: number): Level[] {
  return levels.filter((level) => level.chapter === chapter)
}
