# Proof Puzzle

**Solve block puzzles by writing Lean 4 proofs.** A grid of colored blocks sits next to a target
picture. You clear a level by writing a short proof where every line is a move: `swap`, `paint` or
`rotate`. The board updates as you type. An illegal move turns its block red and the proof fails on
that line. The level is cleared when the proof compiles and the board matches the target.

Early levels take two moves. Later ones teach you to name a pattern with `def`, pass it `Nat` and
`Color` arguments, compose helpers, and fold everything into `for` loops with Nat arithmetic.

```lean
def tile (i : Nat) := by
  paint i teal
  rotate i

theorem level21 : Solve start target := by
  for r in [0:4] do
    for c in [0:2] do
      tile (r * 4 + c * 2 + r % 2)
```

## Highlights

- **Real Lean 4, not just Lean-flavored.** `lean/ProofPuzzle.lean` defines boards, moves and an
  inductive `Solve` relation, and implements `swap`, `paint`, `rotate` and `for` as genuine Lean
  tactics. Each move is checked by `rfl`, so an illegal move fails in Lean on the same line where the
  game turns a block red. Any proof can be exported as a standalone `.lean` file or opened directly in
  the Lean 4 web editor. All 21 reference solutions are verified by the real Lean compiler in the test
  suite (`npm run verify:lean`).
- **Lean-style InfoView.** Put the caret on any line and the board shows the state after that line,
  like Lean's tactic state. The InfoView lists the goal (`⊢ board = target`) with each unsolved cell
  as a hypothesis, the messages, and every expanded move with the helper calls that produced it.
- **A small functional language.** Typed helpers (`(a b : Nat) (c : Color)`), helper composition
  without recursion, Nat arithmetic with Lean semantics (truncated subtraction, `x / 0 = 0`), ranges
  `[a:b:step]`, lists, and nested loops. The pipeline is pure: `parse → resolve (type-check) → expand →
  run → trace`.
- **An editor that feels like a proof assistant.** Squiggly diagnostics, Lean-like messages
  (`declaration uses 'sorry'`, `unused variable`), autocomplete with snippets and your own helpers, and
  notes at the end of each line showing how many cells are left or `✓ goals accomplished`.
- **Click to prove.** Click a block to paint or rotate it, or click two blocks to swap them. The
  matching tactic is written into your proof, so newcomers learn the syntax by doing.
- **21 levels in 3 chapters**: Tactics, Definitions, Iteration. Each level's target is generated from
  its reference proof, so every level is solvable by construction. Stars reward matching the move par
  and, on later levels, the line par.
- **Endless play.** A daily challenge, seeded random puzzles in three difficulties with a
  solver-computed par, and a **workshop** for designing puzzles and sharing them as links.
- **Polish.** Animated moves and playback, timeline scrubbing, hints that escalate from a nudge to a
  suggested next move, confetti, sound, color-letter mode for color-blind players, reduced motion,
  and progress saved in the browser.

## Run locally

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # unit and UI tests
npm run build        # production build in dist/
```

### Checking proofs with Lean

Install Lean with [elan](https://github.com/leanprover/elan), then:

```sh
npm run verify:lean  # exports every level's solution and checks it with Lean 4
cd lean && lake build
```

## Proof language

```lean
theorem name : Solve start target := by
  swap i j            -- exchange two blocks
  paint i color       -- blue green yellow purple orange teal
  rotate i            -- quarter turn clockwise
  rotate i ccw        -- quarter turn counterclockwise
  sorry               -- leave the proof unfinished
```

Blocks are numbered from 0, left to right, then top to bottom. `--` and `/- -/` are comments.

| Block | Meaning |
| --- | --- |
| Pinned | cannot be swapped |
| Locked | cannot be painted or rotated, but can be swapped |
| Fixed | cannot rotate |

From chapter 2, helpers go above the theorem and are called like tactics:

```lean
def drop (top : Nat) (c : Color) := by
  swap top (top + 3)
  paint (top + 3) c
```

From chapter 3, loops run over ranges or lists:

```lean
for i in [0:8:2] do rotate i
for i in [0, 3, 5] do paint i orange
```

## Project layout

```
src/engine/    pure TypeScript: parser, type checker, expander, runner, solver, generator, Lean export
src/levels/    the campaign, written as start boards plus reference proofs
src/ui/        React UI: play screen, editor, infoview, workshop, home
lean/          the Lean 4 library that makes the tactics real
```
