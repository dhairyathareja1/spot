type GoalPanelProps = {
  distance: number
  differingIndices: number[]
}

export function GoalPanel({ distance, differingIndices }: GoalPanelProps) {
  return (
    <section className="goal-panel" aria-labelledby="goal-heading">
      <h2 id="goal-heading">Goal</h2>
      <p className="goal-expression"><span aria-hidden="true">⊢</span> board = target</p>
      {distance === 0 ? (
        <p className="goal-complete">no goals ✓ QED</p>
      ) : (
        <p className="goal-difference">
          {distance} {distance === 1 ? 'cell' : 'cells'} still differ: {differingIndices.map((index) => `#${index}`).join(', ')}
        </p>
      )}
    </section>
  )
}
