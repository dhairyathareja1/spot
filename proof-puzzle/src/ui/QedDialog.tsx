import { motion } from 'framer-motion'
import type { StarRating } from '../engine/rating'
import { Dialog } from './Dialog'
import { ArrowRightIcon, CheckIcon, CloseIcon, StarIcon } from './Icons'

type QedDialogProps = {
  open: boolean
  stars: StarRating | 0
  moves: number
  size: number
  par: number
  parSize?: number
  newBest: boolean
  hasNext: boolean
  nextLabel: string
  onNext: () => void
  onClose: () => void
  onReplay: () => void
  onLean: () => void
  onShare: () => void
  shareState: 'idle' | 'copied'
}

export function QedDialog(props: QedDialogProps) {
  const { open, stars, moves, size, par, parSize, newBest, hasNext, nextLabel } = props
  const verdict = stars === 3
    ? 'Perfect! You matched the best score.'
    : stars === 2
      ? parSize !== undefined && size > parSize ? 'Correct! Can you make it shorter with a helper or a loop?' : 'Correct! There is a shorter way.'
      : 'Correct! There is a much shorter way.'

  return (
    <Dialog open={open} onClose={props.onClose} labelledBy="qed-title" className="qed-dialog">
      <p className="qed-eyebrow">Proof complete</p>
      <h2 id="qed-title" className="qed-title">Q.E.D.</h2>
      <div className="qed-stars" role="img" aria-label={`${stars} out of 3 stars`}>
        {[1, 2, 3].map((star) => (
          <motion.span
            key={star}
            className={`qed-star${star <= stars ? ' is-earned' : ''}`}
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15 + star * 0.14, type: 'spring', stiffness: 420, damping: 14 }}
          >
            <StarIcon size={56} />
          </motion.span>
        ))}
      </div>
      <p className="qed-verdict">{verdict}{newBest && <span className="qed-best">New best</span>}</p>
      <dl className="qed-stats">
        <div>
          <dt>Moves</dt>
          <dd className={moves <= par ? 'is-par' : ''}>{moves}<span> / best {par}</span></dd>
        </div>
        <div>
          <dt>Lines</dt>
          <dd className={parSize === undefined || size <= parSize ? 'is-par' : ''}>{size}{parSize !== undefined && <span> / best {parSize}</span>}</dd>
        </div>
      </dl>
      <div className="qed-actions">
        {hasNext
          ? <button type="button" className="button button-primary" data-autofocus onClick={props.onNext}>{nextLabel} <ArrowRightIcon /></button>
          : <a className="button button-primary" data-autofocus href="#/">All levels</a>}
        <button type="button" className="button" onClick={props.onReplay}>Replay</button>
        <button type="button" className="button" onClick={props.onLean}>See it in Lean 4</button>
        <button type="button" className="button" onClick={props.onShare}>{props.shareState === 'copied' ? <><CheckIcon /> Link copied</> : 'Share proof'}</button>
      </div>
      <button type="button" className="dialog-close" onClick={props.onClose} aria-label="Close"><CloseIcon /></button>
    </Dialog>
  )
}
