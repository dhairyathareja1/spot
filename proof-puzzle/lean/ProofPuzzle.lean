import Lean

/-!
# Proof Puzzle in Lean 4

The game's proof language is a small set of real Lean 4 tactics. A board is a list of blocks,
`Solve start target` says the start board can be rearranged into the target with legal moves,
and every tactic line applies one move. An illegal move does not reduce to `some _`, so `rfl`
fails on exactly that line, just like the red block in the game.
-/

namespace ProofPuzzle

inductive Color where
  | blue | green | yellow | purple | orange | teal
  deriving DecidableEq, Repr

structure Block where
  color : Color
  rot : Nat := 0
  locked : Bool := false
  canRotate : Bool := true
  pinned : Bool := false
  deriving DecidableEq, Repr

abbrev Board := List Block

/-- What the target compares: color and facing. -/
def Board.faces (b : Board) : List (Color × Nat) :=
  b.map fun block => (block.color, block.rot % 4)

inductive Move where
  | swap (i j : Nat)
  | paint (i : Nat) (c : Color)
  | rotate (i : Nat) (turns : Nat)

def Move.apply : Move → Board → Option Board
  | .swap i j, b =>
    match b[i]?, b[j]? with
    | some x, some y =>
      if i = j || x.pinned || y.pinned then none else some ((b.set i y).set j x)
    | _, _ => none
  | .paint i c, b =>
    match b[i]? with
    | some x => if x.locked || x.color == c then none else some (b.set i { x with color := c })
    | none => none
  | .rotate i turns, b =>
    match b[i]? with
    | some x =>
      if x.locked || !x.canRotate then none else some (b.set i { x with rot := (x.rot + turns) % 4 })
    | none => none

/-- `Solve start target`: a sequence of legal moves turns `start` into `target`. -/
inductive Solve : Board → Board → Prop where
  | done {b t : Board} : b.faces = t.faces → Solve b t
  | step {b b' t : Board} (m : Move) : m.apply b = some b' → Solve b' t → Solve b t

/-- Closes the goal as soon as the board matches the target. -/
macro "qed_if_solved" : tactic => `(tactic| try exact Solve.done rfl)

/-- Applies one move. `rfl` only succeeds when the move is legal on the current board. -/
macro "move_step " m:term:max : tactic =>
  `(tactic| (
    (first
      | refine Solve.step $m rfl ?_
      | fail "illegal move: a block is pinned, locked, fixed, out of bounds, or already that color")
    qed_if_solved))

macro "swap " i:term:max j:term:max : tactic => `(tactic| move_step (Move.swap $i $j))
macro "paint " i:term:max c:term:max : tactic => `(tactic| move_step (Move.paint $i $c))
macro "rotate " i:term:max " ccw" : tactic => `(tactic| move_step (Move.rotate $i 3))
macro "rotate " i:term:max " cw" : tactic => `(tactic| move_step (Move.rotate $i 1))
macro "rotate " i:term:max : tactic => `(tactic| move_step (Move.rotate $i 1))

open Lean Elab Tactic Meta in
private def evalNatTerm (stx : Term) : TacticM Nat := do
  let e ← Term.elabTermAndSynthesize stx (some (mkConst ``Nat))
  let e ← instantiateMVars e
  match ← (evalNat e).run with
  | some n => pure n
  | none => throwErrorAt stx "loop bounds must be Nat expressions that evaluate to a number"

open Lean Elab Tactic in
/-- Runs `body` once per value, with the loop variable replaced by that value. -/
private def runLoop (x : Ident) (values : List Term) (body : TSyntax ``Lean.Parser.Tactic.tacticSeq) :
    TacticM Unit := do
  for value in values do
    let paren ← `(($value))
    let replaced ← body.raw.replaceM fun node =>
      pure (if node.isIdent && node.getId == x.getId then some paren.raw else none)
    evalTactic replaced

syntax "for " ident " in " "[" term ":" term (":" term)? "]" " do " tacticSeq : tactic
syntax "for " ident " in " "[" ":" term (":" term)? "]" " do " tacticSeq : tactic
syntax "for " ident " in " "[" term,* "]" " do " tacticSeq : tactic

open Lean Elab Tactic in
elab_rules : tactic
  | `(tactic| for $x:ident in [$a:term : $b:term $[: $s:term]?] do $body:tacticSeq) => do
    let start ← evalNatTerm a
    let stop ← evalNatTerm b
    let step ← match s with
      | some s => evalNatTerm s
      | none => pure 1
    if step == 0 then throwError "loop step must be greater than 0"
    let values ← ((List.range ((stop - start + step - 1) / step)).map (start + · * step)).mapM
      fun n => `($(Syntax.mkNumLit (toString n)))
    runLoop x values body
  | `(tactic| for $x:ident in [: $b:term $[: $s:term]?] do $body:tacticSeq) => do
    let stop ← evalNatTerm b
    let step ← match s with
      | some s => evalNatTerm s
      | none => pure 1
    if step == 0 then throwError "loop step must be greater than 0"
    let values ← ((List.range ((stop + step - 1) / step)).map (· * step)).mapM
      fun n => `($(Syntax.mkNumLit (toString n)))
    runLoop x values body
  | `(tactic| for $x:ident in [$items:term,*] do $body:tacticSeq) =>
    runLoop x items.getElems.toList body

end ProofPuzzle

export ProofPuzzle.Color (blue green yellow purple orange teal)
