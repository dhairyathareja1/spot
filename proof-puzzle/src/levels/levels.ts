import type { Board, Block, Color, Level } from '../engine/types'

function makeBlock(color: Color, overrides: Partial<Block> = {}): Block {
  return {
    color,
    rot: 0,
    locked: false,
    canRotate: true,
    pinned: false,
    ...overrides,
  }
}

function makeBoard(rows: number, cols: number, cells: Block[]): Board {
  return { rows, cols, cells }
}

function starterCode(id: number): string {
  return `theorem level${id} : Solve start target := by\n  sorry\n`
}

export const levels: Level[] = [
  {
    id: 1,
    title: 'First Steps',
    story: 'Swap the first two blocks, then repaint the last.',
    start: makeBoard(1, 3, [makeBlock('blue'), makeBlock('green'), makeBlock('yellow')]),
    target: makeBoard(1, 3, [makeBlock('green'), makeBlock('blue'), makeBlock('purple')]),
    par: 2,
    allowHelpers: false,
    starterCode: starterCode(1),
    hint: 'Swap 0 and 1, then paint 2 purple.',
  },
  {
    id: 2,
    title: 'Spin',
    story: 'A small spin and color change align the target.',
    start: makeBoard(1, 3, [makeBlock('blue'), makeBlock('green'), makeBlock('yellow')]),
    target: makeBoard(1, 3, [
      makeBlock('blue', { rot: 1 }),
      makeBlock('teal'),
      makeBlock('yellow'),
    ]),
    par: 2,
    allowHelpers: false,
    starterCode: starterCode(2),
    hint: 'Rotate 0 clockwise, then paint 1 teal.',
  },
  {
    id: 3,
    title: 'Swap Meet',
    story: 'Reverse the row by swapping its outer and inner pairs.',
    start: makeBoard(1, 4, [
      makeBlock('blue'),
      makeBlock('green'),
      makeBlock('yellow'),
      makeBlock('purple'),
    ]),
    target: makeBoard(1, 4, [
      makeBlock('purple'),
      makeBlock('yellow'),
      makeBlock('green'),
      makeBlock('blue'),
    ]),
    par: 2,
    allowHelpers: false,
    starterCode: starterCode(3),
    hint: 'Swap 0 with 3, then swap 1 with 2.',
  },
  {
    id: 4,
    title: 'Pinned in Place',
    story: 'A pinned block forces you to work around it.',
    start: makeBoard(1, 4, [
      makeBlock('blue'),
      makeBlock('green', { pinned: true }),
      makeBlock('yellow'),
      makeBlock('purple'),
    ]),
    target: makeBoard(1, 4, [
      makeBlock('yellow'),
      makeBlock('green', { pinned: true }),
      makeBlock('blue'),
      makeBlock('orange'),
    ]),
    par: 2,
    allowHelpers: false,
    starterCode: starterCode(4),
    hint: 'Swap 0 and 2, then paint 3 orange.',
  },
  {
    id: 5,
    title: 'Grid',
    story: 'Use row-major indices to finish this small grid.',
    start: makeBoard(2, 2, [
      makeBlock('blue'),
      makeBlock('green'),
      makeBlock('yellow'),
      makeBlock('purple'),
    ]),
    target: makeBoard(2, 2, [
      makeBlock('purple'),
      makeBlock('orange'),
      makeBlock('yellow', { rot: 1 }),
      makeBlock('blue'),
    ]),
    par: 3,
    allowHelpers: false,
    starterCode: starterCode(5),
    hint: 'Swap 0 and 3, paint 1 orange, then rotate 2.',
  },
  {
    id: 6,
    title: 'Pattern Reuse',
    story: 'Repeat a two-move pattern across this row.',
    start: makeBoard(1, 8, [
      makeBlock('blue'), makeBlock('green'), makeBlock('blue'), makeBlock('green'),
      makeBlock('blue'), makeBlock('green'), makeBlock('blue'), makeBlock('green'),
    ]),
    target: makeBoard(1, 8, [
      makeBlock('teal'), makeBlock('blue'), makeBlock('teal'), makeBlock('blue'),
      makeBlock('teal'), makeBlock('blue'), makeBlock('teal'), makeBlock('blue'),
    ]),
    par: 8,
    allowHelpers: true,
    maxLines: 6,
    starterCode: starterCode(6),
    hint: 'Define a two-move helper with index and color parameters.',
  },
  {
    id: 7,
    title: 'Parameterized Turns',
    story: 'Apply the same pair operation at four different positions.',
    start: makeBoard(1, 8, [
      makeBlock('blue'), makeBlock('green'), makeBlock('blue'), makeBlock('green'),
      makeBlock('blue'), makeBlock('green'), makeBlock('blue'), makeBlock('green'),
    ]),
    target: makeBoard(1, 8, [
      makeBlock('green', { rot: 1 }), makeBlock('blue'),
      makeBlock('green', { rot: 1 }), makeBlock('blue'),
      makeBlock('green', { rot: 1 }), makeBlock('blue'),
      makeBlock('green', { rot: 1 }), makeBlock('blue'),
    ]),
    par: 8,
    allowHelpers: true,
    maxLines: 6,
    starterCode: starterCode(7),
    hint: 'Use Nat parameters to choose which pair each call changes.',
  },
  {
    id: 8,
    title: 'Color Parameters',
    story: 'Use one reusable paint pattern with several colors.',
    start: makeBoard(1, 8, Array.from({ length: 8 }, () => makeBlock('blue'))),
    target: makeBoard(1, 8, [
      makeBlock('purple'), makeBlock('purple'), makeBlock('teal'), makeBlock('teal'),
      makeBlock('orange'), makeBlock('orange'), makeBlock('yellow'), makeBlock('yellow'),
    ]),
    par: 8,
    allowHelpers: true,
    maxLines: 6,
    starterCode: starterCode(8),
    hint: 'Give the helper a Color parameter so calls can choose their paint color.',
  },
  {
    id: 9,
    title: 'Helpers in Layers',
    story: 'Build a larger pattern from an earlier helper.',
    start: makeBoard(1, 8, [
      makeBlock('blue'), makeBlock('green'), makeBlock('blue'), makeBlock('green'),
      makeBlock('blue'), makeBlock('green'), makeBlock('blue'), makeBlock('green'),
    ]),
    target: makeBoard(1, 8, [
      makeBlock('teal'), makeBlock('blue'), makeBlock('teal'), makeBlock('blue'),
      makeBlock('teal'), makeBlock('blue'), makeBlock('teal'), makeBlock('blue'),
    ]),
    par: 8,
    allowHelpers: true,
    maxLines: 7,
    starterCode: starterCode(9),
    hint: 'Let one helper call an earlier helper before applying another move.',
  },
  {
    id: 10,
    title: 'Final Pattern',
    story: 'Reuse a repeated operation to finish the full grid.',
    start: makeBoard(3, 3, [
      makeBlock('blue'), makeBlock('green'), makeBlock('blue'),
      makeBlock('green'), makeBlock('blue'), makeBlock('green'),
      makeBlock('blue'), makeBlock('green'), makeBlock('yellow'),
    ]),
    target: makeBoard(3, 3, [
      makeBlock('teal'), makeBlock('blue'), makeBlock('teal'),
      makeBlock('blue'), makeBlock('teal'), makeBlock('blue'),
      makeBlock('teal'), makeBlock('blue'), makeBlock('yellow'),
    ]),
    par: 8,
    allowHelpers: true,
    maxLines: 6,
    starterCode: starterCode(10),
    hint: 'Break the grid into repeated pairs and reuse a helper for each one.',
  },
]
