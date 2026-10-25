import { grid } from '../engine/board'
import { compile, isCompileSuccess } from '../engine/compile'
import type { Board, Concept, Level } from '../engine/types'

export type Chapter = {
  id: number
  title: string
  tagline: string
}

export const chapters: Chapter[] = [
  { id: 1, title: 'Moves', tagline: 'Each line is one move. Swap, paint and turn blocks until they match the picture.' },
  { id: 2, title: 'Helpers', tagline: 'Give a group of moves a name with def, then use it again and again.' },
  { id: 3, title: 'Loops', tagline: 'Use loops and simple math to write short proofs for big boards.' },
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

// The target is made by running the solution, so every level can be solved.
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
    story: 'Two blocks are in each other\'s spots, and the last block is the wrong color.',
    start: grid(['b g y']),
    solution: proof(1, 'swap 0 1', 'paint 2 purple'),
    hint: 'Swap blocks 0 and 1. Then paint block 2 purple.',
    concept: {
      title: 'Each line is one move',
      body: 'Delete sorry and write one move on each line. The board changes as you type. You win when your board looks like the target.',
      example: 'theorem level1 : Solve start target := by\n  swap 0 1\n  paint 2 purple',
    },
  }),
  defineLevel({
    id: 2,
    chapter: 1,
    title: 'Spin',
    story: 'The arrow on a block shows which way it points.',
    start: grid(['b g y']),
    solution: proof(2, 'rotate 0', 'paint 1 teal'),
    hint: 'Turn block 0 once. Then paint block 1 teal.',
    concept: {
      title: 'Turning blocks',
      body: 'rotate i turns block i a quarter turn to the right, like a clock hand.',
      example: 'rotate 0',
    },
  }),
  defineLevel({
    id: 3,
    chapter: 1,
    title: 'Swap Meet',
    story: 'Make the row read backwards. Use as few moves as you can.',
    start: grid(['b g y p']),
    solution: proof(3, 'swap 0 3', 'swap 1 2'),
    hint: 'Swap the two outside blocks. Then swap the two middle blocks.',
  }),
  defineLevel({
    id: 4,
    chapter: 1,
    title: 'Turn Back',
    story: 'Two blocks point the wrong way. One of them only needs a small turn back.',
    start: grid(['b> g y<']),
    solution: proof(4, 'rotate 0 ccw', 'rotate 2'),
    hint: 'Turn block 0 back to the left with ccw. Turn block 2 once more to the right.',
    concept: {
      title: 'Turning left',
      body: 'Add ccw to turn left instead of right. Three right turns cost three moves, but one left turn costs just one.',
      example: 'rotate 0 ccw',
    },
  }),
  defineLevel({
    id: 5,
    chapter: 1,
    title: 'Pinned in Place',
    story: 'A pinned block can\'t leave its spot, so you have to work around it.',
    start: grid(['b g! y p']),
    solution: proof(5, 'swap 0 2', 'paint 3 orange'),
    hint: 'Leave block 1 alone. Swap blocks 0 and 2.',
    concept: {
      title: 'Pinned blocks',
      body: 'You can paint or turn a pinned block, but you can\'t swap it.',
      example: 'swap 0 2 -- skips block 1',
    },
  }),
  defineLevel({
    id: 6,
    chapter: 1,
    title: 'Locked Paint',
    story: 'The locked block keeps its color and direction, but you can still move it.',
    start: grid(['b* g y o']),
    solution: proof(6, 'swap 0 2', 'paint 0 teal'),
    hint: 'Move the locked blue block with a swap. Then paint the block that lands on 0.',
    concept: {
      title: 'Locked blocks',
      body: 'You can\'t paint or turn a locked block. You can still swap it to a new spot.',
      example: 'swap 0 2',
    },
  }),
  defineLevel({
    id: 7,
    chapter: 1,
    title: 'Counting on a Grid',
    story: 'On bigger boards, blocks are numbered left to right, then top to bottom.',
    start: grid(['b g', 'y p']),
    solution: proof(7, 'swap 0 3', 'paint 1 orange', 'rotate 2'),
    hint: 'Swap the corners 0 and 3. Paint block 1 orange. Turn block 2.',
    concept: {
      title: 'How blocks are numbered',
      body: 'Start at 0 in the top left. Count left to right, one row at a time. Each block shows its number in the corner.',
      example: '-- a 2 by 2 board\n-- 0 1\n-- 2 3',
    },
  }),
  defineLevel({
    id: 8,
    chapter: 1,
    title: 'Musical Chairs',
    story: 'Every block wants the spot to its left. Moving three blocks around takes two swaps.',
    start: grid(['b g y']),
    solution: proof(8, 'swap 0 1', 'swap 1 2'),
    hint: 'Swap 0 and 1 first. Then swap 1 and 2.',
  }),
  defineLevel({
    id: 9,
    chapter: 1,
    title: 'Bolted Down',
    story: 'A block with a crossed circle can\'t turn at all. Plan around it.',
    start: grid(['t o# b', 'b! y g>']),
    solution: proof(9, 'swap 0 2', 'rotate 5 ccw', 'paint 1 purple', 'rotate 4'),
    hint: 'Swap the corners on the top row. Fix the arrows on the bottom row. Then paint block 1.',
    concept: {
      title: 'Blocks that can\'t turn',
      body: 'A block with a crossed circle can\'t be turned. You can still paint it and swap it.',
      example: 'paint 1 purple',
    },
  }),
  defineLevel({
    id: 10,
    chapter: 2,
    title: 'Your First def',
    story: 'The same two moves happen four times. Write them once.',
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
    hint: 'Make a helper that takes two numbers and a color. Then use it four times.',
    concept: {
      title: 'Naming moves with def',
      body: 'A helper works like a function. You give it some values and it makes moves. Numbers have the type Nat and colors have the type Color. You use a helper just like a move.',
      example: 'def swapAndPaint (a b : Nat) (c : Color) := by\n  swap a b\n  paint a c\n\ntheorem level10 : Solve start target := by\n  swapAndPaint 0 1 teal',
    },
  }),
  defineLevel({
    id: 11,
    chapter: 2,
    title: 'Same Moves, New Spots',
    story: 'Do the same two moves at four different places.',
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
    hint: 'Give the helper number inputs, so each use can pick a different pair.',
  }),
  defineLevel({
    id: 12,
    chapter: 2,
    title: 'Pick a Color',
    story: 'One paint pattern, four different colors.',
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
    hint: 'Give the helper a Color input, so each use can choose its own color.',
  }),
  defineLevel({
    id: 13,
    chapter: 2,
    title: 'Helpers in Layers',
    story: 'Two patterns start with the same three moves. Build the bigger one out of the smaller one.',
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
    hint: 'A helper can use any helper written above it. Let flipPaint use flip.',
    concept: {
      title: 'Helpers can use helpers',
      body: 'A helper can use other helpers written above it. A helper can\'t use itself, so every proof always finishes.',
      example: 'def flipPaint (a b : Nat) := by\n  flip a b\n  paint a orange',
    },
  }),
  defineLevel({
    id: 14,
    chapter: 2,
    title: 'Diagonal',
    story: 'Paint the diagonal yellow and give each of those blocks one turn.',
    start: grid(['b g b', 'g b g', 'b g b']),
    solution: helperProof(
      14,
      ['def mark (i : Nat) := by', '  paint i yellow', '  rotate i'],
      'mark 0',
      'mark 4',
      'mark 8',
    ),
    maxLines: 5,
    hint: 'On a 3 by 3 board, the diagonal is blocks 0, 4 and 8.',
  }),
  defineLevel({
    id: 15,
    chapter: 2,
    title: 'Drop Down',
    story: 'Each top block drops into the row below and gets a new color.',
    start: grid(['o> pv t<', 'b b b']),
    solution: helperProof(
      15,
      ['def drop (top : Nat) (c : Color) := by', '  swap top (top + 3)', '  paint (top + 3) c'],
      'drop 0 yellow',
      'drop 1 green',
      'drop 2 blue',
    ),
    maxLines: 5,
    hint: 'With three columns, the block under block i is i + 3. Put math inside brackets.',
    concept: {
      title: 'Doing math',
      body: 'You can use + - * / % inside brackets. Like in Lean, numbers never go below zero, so 2 - 5 gives 0.',
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
    hint: '[0:8] means 0, 1, 2 and so on, up to 7.',
    concept: {
      title: 'for loops',
      body: 'for i in [a:b] do repeats a move for every i from a up to b, but not b itself. The loop and the move inside count as two lines.',
      example: 'for i in [0:8] do\n  paint i teal',
    },
  }),
  defineLevel({
    id: 17,
    chapter: 3,
    title: 'Every Other One',
    story: 'Only every second block needs a turn.',
    start: grid(['b g b g b g b g']),
    solution: proof(17, 'for i in [0:8:2] do rotate i'),
    maxLines: 2,
    hint: 'Add a third number to skip ahead: [0:8:2].',
    concept: {
      title: 'Skipping',
      body: 'A third number sets how far to jump each time. [0:8:2] gives 0, 2, 4 and 6.',
      example: 'for i in [0:8:2] do rotate i',
    },
  }),
  defineLevel({
    id: 18,
    chapter: 3,
    title: 'Mirror',
    story: 'Flip a row of eight. Block i swaps with block 7 - i.',
    start: grid(['b g y p o t b g']),
    solution: proof(18, 'for i in [0:4] do swap i (7 - i)'),
    maxLines: 2,
    hint: 'Loop over the first half and swap each block with its partner.',
  }),
  defineLevel({
    id: 19,
    chapter: 3,
    title: 'Pick and Choose',
    story: 'The blocks to paint have no pattern. Just list them.',
    start: grid(['b b b b b b b b']),
    solution: proof(19, 'for i in [0, 3, 5, 6] do paint i orange'),
    maxLines: 2,
    hint: 'A loop can go over a list: [0, 3, 5, 6].',
    concept: {
      title: 'Lists',
      body: 'A loop can go over a list you write yourself. Lists of colors work too.',
      example: 'for i in [0, 3, 5, 6] do paint i orange',
    },
  }),
  defineLevel({
    id: 20,
    chapter: 3,
    title: 'Loop in a Loop',
    story: 'Paint the 2 by 2 middle of a 4 by 4 board.',
    start: grid(['g g g g', 'g g g g', 'g g g g', 'g g g g']),
    solution: proof(20, 'for r in [1:3] do', '  for c in [1:3] do', '    paint (r * 4 + c) purple'),
    maxLines: 3,
    hint: 'Loop over rows and columns. The block in row r and column c is r * 4 + c.',
    concept: {
      title: 'Loops inside loops',
      body: 'Put the loop body on the next lines with extra spaces in front. You can even put a loop inside another loop.',
      example: 'for r in [1:3] do\n  for c in [1:3] do\n    paint (r * 4 + c) purple',
    },
  }),
  defineLevel({
    id: 21,
    chapter: 3,
    title: 'Checkerboard',
    story: 'Make a full checkerboard of turned teal tiles. Use everything you have learned.',
    start: grid(['b b b b', 'b b b b', 'b b b b', 'b b b b']),
    solution: helperProof(
      21,
      ['def tile (i : Nat) := by', '  paint i teal', '  rotate i'],
      'for r in [0:4] do',
      '  for c in [0:2] do',
      '    tile (r * 4 + c * 2 + r % 2)',
    ),
    maxLines: 5,
    hint: 'Each row has two tiles. Move every other row over by one with r % 2.',
  }),
]

export function findLevel(id: number): Level | undefined {
  return levels.find((level) => level.id === id)
}

export function levelsInChapter(chapter: number): Level[] {
  return levels.filter((level) => level.chapter === chapter)
}
