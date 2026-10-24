import type { Board } from '../engine/types'
import { BoardView } from './BoardView'

type TargetViewProps = {
  board: Board
}

export function TargetView({ board }: TargetViewProps) {
  return (
    <section className="target-section" aria-labelledby="target-heading">
      <h2 id="target-heading">Target</h2>
      <div className={`target-board${board.cols >= 6 ? ' target-board-wide' : ''}`}>
        <BoardView board={board} />
      </div>
    </section>
  )
}
