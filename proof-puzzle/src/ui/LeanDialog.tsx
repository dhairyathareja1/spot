import { useState } from 'react'
import { leanPlaygroundUrl } from '../engine/lean'
import { Dialog } from './Dialog'
import { CheckIcon, CloseIcon, ExternalIcon } from './Icons'

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
      <h2 id="lean-title">Your proof in Lean 4</h2>
      <p className="dialog-lead">
        This file has a small Lean library that describes boards and moves, followed by your proof. In that library,
        each move is a Lean tactic, and Lean checks that every move is legal. Helpers become Lean macros.
      </p>
      <pre className="lean-code"><code>{proofPart}</code></pre>
      <p className="dialog-note">Above this part, the file also has the {code.split('\n').length - proofPart.split('\n').length} lines of the ProofPuzzle library.</p>
      <div className="dialog-actions">
        <a className="button button-primary" href={leanPlaygroundUrl(code)} target="_blank" rel="noreferrer">Open in Lean 4 online <ExternalIcon size={16} /></a>
        <button type="button" className="button" onClick={download}>Download {fileName}</button>
        <button type="button" className="button" onClick={copy}>{copied ? <><CheckIcon /> Copied</> : 'Copy'}</button>
      </div>
      <button type="button" className="dialog-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
    </Dialog>
  )
}
