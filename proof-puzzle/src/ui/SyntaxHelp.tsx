type SyntaxHelpProps = {
  allowHelpers: boolean
  allowLoops: boolean
}

export function SyntaxHelp({ allowHelpers, allowLoops }: SyntaxHelpProps) {
  return (
    <details className="syntax-help">
      <summary>Reference</summary>
      <div className="syntax-grid">
        <code>swap i j</code><span>exchange blocks i and j</span>
        <code>paint i color</code><span>blue green yellow purple orange teal</span>
        <code>rotate i</code><span>quarter turn clockwise</span>
        <code>rotate i ccw</code><span>quarter turn counterclockwise</span>
        <code>sorry</code><span>leave the proof unfinished</span>
        <code>-- note</code><span>comment, ignored</span>
        {allowHelpers && (
          <>
            <code>def f (i : Nat) (c : Color) := by</code><span>a helper; call it as <code>f 3 teal</code></span>
            <code>(i + 1)</code><span>Nat arithmetic: + - * / %, in parentheses</span>
          </>
        )}
        {allowLoops && (
          <>
            <code>for i in [a:b] do</code><span>i = a, a+1, …, b-1</span>
            <code>for i in [a:b:s] do</code><span>count in steps of s</span>
            <code>for c in [teal, blue] do</code><span>loop over a list</span>
          </>
        )}
      </div>
      <p className="syntax-note">
        Blocks are numbered from 0, left to right, then top to bottom.{' '}
        <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> plays the proof, <kbd>Alt</kbd>+<kbd>←</kbd>/<kbd>→</kbd> steps through it.
      </p>
    </details>
  )
}
