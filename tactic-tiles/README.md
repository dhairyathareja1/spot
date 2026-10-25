# Tactic Tiles

A puzzle game where you change a grid of colored blocks to match a target picture by writing a
short proof. Each line of the proof is one move: `swap`, `paint` or `rotate`. The board updates as
you type. If a move is not allowed, that block turns red and the proof stops on that line. A level
is solved when the proof has no errors and the board matches the target.

The first levels need two moves. Later levels add helpers (`def`) that take `Nat` and `Color`
inputs, helpers that use other helpers, `for` loops, and simple math such as `(r * 4 + c)`.

```lean
def tile (i : Nat) := by
  paint i teal
  rotate i

theorem level21 : Solve start target := by
  for r in [0:4] do
    for c in [0:2] do
      tile (r * 4 + c * 2 + r % 2)
```

## Features

- **21 levels in three chapters:** Moves, Helpers and Loops. Each level's target is made by running
  its answer proof, so every level can be solved.
- **Board follows the cursor:** put the cursor on a line to see the board after that line.
- **Goal panel:** lists the blocks that still differ from the target, any errors or warnings, and
  every move the proof produced.
- **Editor help:** error underlines, autocomplete, and a note at the end of each line showing how
  many blocks are left to fix.
- **Click to build moves:** click a block to paint or turn it, or click two blocks to swap them. The
  matching line is added to the proof.
- **Stars:** based on the number of moves and, on later levels, the number of lines.
- **Hints:** first the level hint, then a suggested next move from a simple solver, then an answer.
- **More puzzles:** a daily puzzle, random puzzles in three sizes, and a page for making your own
  puzzle and sharing it as a link.
- **Lean 4 export:** any proof can be exported as a `.lean` file or opened in the Lean 4 online
  editor (see below).
- Background music and sound effects, each with an on/off button in the navbar.

## Running locally

```sh
npm install
npm run dev      # start the dev server
npm test         # run the tests
npm run build    # build for production into dist/
```

`npm test` skips the Lean checks, so it does not need Lean installed.

## Lean 4

`lean/TacticTiles.lean` is a small Lean 4 library. In it, a board is a list of blocks, and
`Solve start target` means the start board can be turned into the target with legal moves.
`swap`, `paint`, `rotate` and `for` are defined as Lean tactics, so the game's proof syntax is
also Lean syntax. Each move is checked with `rfl`, which fails if the move is not legal.

The export (`src/engine/lean.ts`) writes a single file with the library, the two boards and the
proof. Helpers written with `def` in the game are exported as Lean macros, since a Lean `def`
cannot hold tactic steps. Everything else is copied as written.

The answer proofs for all 21 levels can be checked with the Lean compiler:

```sh
npm run verify:lean
```

This needs Lean 4 installed through [elan](https://github.com/leanprover/elan). The test looks for
Lean in this order: the `LEAN_BIN` environment variable, then `~/.elan/bin/lean` (`lean.exe` on
Windows), then `lean` on your `PATH`. The script uses Vitest's `--mode` option instead of an
environment variable, so the same command works in PowerShell, Command Prompt and Unix shells.

This checks the 21 answer proofs and one proof that should fail. Proofs that players write are not
checked by Lean automatically. You can check one by exporting it from the game.

## Proof language

```lean
theorem name : Solve start target := by
  swap i j            -- swap two blocks
  paint i color       -- blue, green, yellow, purple, orange or teal
  rotate i            -- turn a block to the right
  rotate i ccw        -- turn a block to the left
  sorry               -- leave the proof unfinished
```

Blocks are numbered from 0, left to right, then top to bottom. `--` and `/- -/` are comments.

| Block | Rule |
| --- | --- |
| Pinned | cannot be swapped |
| Locked | cannot be painted or turned, but can be swapped |
| Crossed circle | cannot be turned |

From chapter 2, helpers go above the theorem and are used like moves:

```lean
def drop (top : Nat) (c : Color) := by
  swap top (top + 3)
  paint (top + 3) c
```

From chapter 3, loops can go over a range or a list:

```lean
for i in [0:8:2] do rotate i
for i in [0, 3, 5] do paint i orange
```

Math follows Lean's rules for `Nat`: numbers never go below zero, so `2 - 5` is `0`, and dividing
by zero gives `0`.

## Project layout

```
src/engine/   reading, type checking, expanding and running proofs; solver; puzzle generator; Lean export
src/levels/   the 21 levels, each written as a start board and an answer proof
src/ui/       the React screens, editor, board, music and sound
src/tests/    tests for the engine, levels, storage, links and screens
lean/         the Lean 4 library
```
