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
]
