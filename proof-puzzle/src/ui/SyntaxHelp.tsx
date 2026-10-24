import type { Color } from '../engine/types'

const colors: Color[] = ['blue', 'green', 'yellow', 'purple', 'orange', 'teal']

export function SyntaxHelp() {
  return (
    <details className="syntax-help">
      <summary>Syntax help: moves and color names</summary>
      <div className="syntax-help-content">
        <p>The first non-empty line must be a theorem declaration:</p>
        <pre><code>theorem &lt;name&gt; : Solve start target := by</code></pre>
        <p>Then write one move per line:</p>
        <ul>
          <li><code>swap &lt;i&gt; &lt;j&gt;</code> exchanges blocks at indices <code>i</code> and <code>j</code>.</li>
          <li><code>paint &lt;i&gt; &lt;color&gt;</code> paints the block at index <code>i</code>.</li>
          <li><code>rotate &lt;i&gt;</code> rotates clockwise.</li>
          <li><code>rotate &lt;i&gt; ccw</code> rotates counterclockwise.</li>
        </ul>
        <p className="syntax-colors-label">Color names:</p>
        <div className="syntax-colors" aria-label="Available color names">
          {colors.map((color) => (
            <span className={`syntax-color color-${color}`} key={color}>{color}</span>
          ))}
        </div>
        <p>Indices start at 0 and go left to right, then top to bottom. Blank lines and <code>--</code> comments are ignored. <code>sorry</code> stops the proof. Other Lean tactics and helper definitions are not supported.</p>
        <p>Angle-bracketed words such as <code>&lt;i&gt;</code> are placeholders; replace them with an index or a color name.</p>
      </div>
    </details>
  )
}
