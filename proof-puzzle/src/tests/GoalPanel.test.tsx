import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GoalPanel } from '../ui/GoalPanel'

describe('GoalPanel', () => {
  it('shows the remaining cells and their indices', () => {
    const markup = renderToStaticMarkup(<GoalPanel distance={2} differingIndices={[0, 3]} />)

    expect(markup).toContain('⊢</span> board = target')
    expect(markup).toContain('2 cells still differ: #0, #3')
  })

  it('shows QED when no cells differ', () => {
    const markup = renderToStaticMarkup(<GoalPanel distance={0} differingIndices={[]} />)

    expect(markup).toContain('no goals ✓ QED')
  })
})
