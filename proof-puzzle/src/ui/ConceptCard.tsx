import { motion } from 'framer-motion'
import type { Concept } from '../engine/types'

type ConceptCardProps = {
  concept: Concept
  onDismiss: () => void
}

export function ConceptCard({ concept, onDismiss }: ConceptCardProps) {
  return (
    <motion.aside
      className="concept-card"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      aria-label={`New idea: ${concept.title}`}
    >
      <div>
        <p className="concept-eyebrow">New idea</p>
        <h3>{concept.title}</h3>
        <p>{concept.body}</p>
      </div>
      <pre><code>{concept.example}</code></pre>
      <button type="button" className="concept-dismiss" onClick={onDismiss} aria-label="Dismiss">Got it</button>
    </motion.aside>
  )
}
