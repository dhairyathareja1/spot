type SyntaxHelpProps = {
  allowHelpers: boolean
  allowLoops: boolean
}

export function SyntaxHelp({ allowHelpers, allowLoops }: SyntaxHelpProps) {
  return (
    <details className="syntax-help">
      <summary>Help</summary>
      <div className="syntax-grid">
        <code>swap i j</code><span>swap blocks i and j</span>
        <code>paint i color</code><span>blue, green, yellow, purple, orange or teal</span>
        <code>rotate i</code><span>turn block i to the right</span>
        <code>rotate i ccw</code><span>turn block i to the left</span>
        <code>sorry</code><span>leave the proof unfinished</span>
        <code>-- note</code><span>a comment, the game skips it</span>
        {allowHelpers && (
          <>
            <code>def f (i : Nat) (c : Color) := by</code><span>make a helper, then use it like <code>f 3 teal</code></span>
            <code>(i + 1)</code><span>math: + - * / %, always inside brackets</span>
          </>
        )}
        {allowLoops && (
          <>
            <code>for i in [a:b] do</code><span>repeat for i = a, a + 1, up to b - 1</span>
            <code>for i in [a:b:s] do</code><span>jump by s each time</span>
            <code>for c in [teal, blue] do</code><span>repeat for each item in a list</span>
          </>
        )}
      </div>
      <p className="syntax-note">
        Blocks are numbered from 0, left to right, then top to bottom.{' '}
        <kbd>Ctrl</kbd> + <kbd>Enter</kbd> plays the proof. <kbd>Alt</kbd> + arrow keys step through it.
      </p>
    </details>
  )
}
