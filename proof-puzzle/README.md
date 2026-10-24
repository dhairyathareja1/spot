# Proof Puzzle

Proof Puzzle is a browser puzzle game where you transform a grid of colored blocks into a target by writing short Lean-style proofs. Each proof statement applies a move to the board, so you can watch the result step by step, debug invalid moves, and earn up to three stars for concise solutions.

## Run locally

```sh
npm i
npm run dev
npm test
```

Run `npm run build` to create a production build.

## Proof language

Start with a theorem declaration, then write one move per line. Angle-bracketed values below are placeholders; replace them with actual names, indices, or colors.

```lean
theorem <name> : Solve start target := by
  swap <i> <j>
  paint <i> <color>
  rotate <i>
  rotate <i> ccw
```

- `swap <i> <j>` exchanges two blocks.
- `paint <i> <color>` changes a block to one of `blue`, `green`, `yellow`, `purple`, `orange`, or `teal`.
- `rotate <i>` turns clockwise; add `ccw` to turn counterclockwise.
- Indices are zero-based and count left to right, then top to bottom.
- Blank lines and `--` comments are ignored. `sorry` stops the proof and leaves it incomplete.

Levels that allow helpers support typed parameters and calls to helpers defined earlier:

```lean
def paintAt (cell : Nat) (shade : Color) := by
  paint cell shade

theorem <name> : Solve start target := by
  paintAt <index> <color>
```

Helper parameters may be `Nat` or `Color`. Helpers cannot call themselves or later definitions. Calls can nest up to 8 levels and expand to at most 200 moves. Some levels also set a source statement limit.

## Engine

All code in `src/engine` is pure TypeScript: it takes input values and returns results without React, DOM access, or mutation. Proof execution follows `source -> parse -> resolve -> expand -> run -> trace`.
