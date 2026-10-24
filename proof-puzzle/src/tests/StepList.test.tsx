import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StepList } from '../ui/StepList'

describe('StepList', () => {
  it('shows helper call stacks and highlights the current expanded step', () => {
    const markup = renderToStaticMarkup(
      <StepList
        cursor={1}
        trace={{
          steps: [{
            move: { kind: 'swap', a: 0, b: 1 },
            line: 2,
            callStack: ['swapAndPaint', 'swapPair'],
          }],
          states: [],
          distance: [],
          solved: false,
        }}
      />,
    )

    expect(markup).toContain('via swapAndPaint → swapPair')
    expect(markup).toContain('line 3')
    expect(markup).toContain('is-current')
  })
})
