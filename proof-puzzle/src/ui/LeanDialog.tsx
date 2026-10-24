import { useState } from 'react'
import { leanPlaygroundUrl } from '../engine/lean'
import { Dialog } from './Dialog'

type LeanDialogProps = {
  open: boolean
  code: string
  fileName: string
  onClose: () => void
}

export function LeanDialog({ open, code, fileName, onClose }: LeanDialogProps) {
  const [copied, setCopied] = useState(false)
  const proofStart = code.indexOf('open ProofPuzzle')
  const proofPart = proofStart >= 0 ? code.slice(proofStart) : code

  function copy() {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  function download() {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="lean-title" className="lean-dialog">
      <h2 id="lean-title">Your proof, in real Lean 4</h2>
      <p className="dialog-lead">
        Every tactic in this game is a real Lean 4 tactic. The file below includes a small library that
        defines boards, moves and <code>Solve</code>, then your proof. Lean checks each move with <code>rfl</code>, so an
        illegal move fails on the same line as it does here.
      </p>
      <pre className="lean-code"><code>{proofPart}</code></pre>
      <p className="dialog-note">The full file also contains the {code.split('\n').length - proofPart.split('\n').length}-line ProofPuzzle library above this.</p>
      <div className="dialog-actions">
        <a className="button button-primary" href={leanPlaygroundUrl(code)} target="_blank" rel="noreferrer">Open in Lean 4 Web ↗</a>
        <button type="button" className="button" onClick={download}>Download {fileName}</button>
        <button type="button" className="button" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>
      <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">✕</button>
    </Dialog>
  )
}
