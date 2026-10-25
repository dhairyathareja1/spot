import type { Trace } from '../engine/types'
import { PauseIcon, PlayIcon, SkipEndIcon, SkipStartIcon, StepBackIcon, StepForwardIcon } from './Icons'

type TimelineProps = {
  trace?: Trace
  cursor: number
  playing: boolean
  onSeek: (cursor: number) => void
  onPlay: () => void
  onPause: () => void
}

export function Timeline({ trace, cursor, playing, onSeek, onPlay, onPause }: TimelineProps) {
  const last = trace ? trace.states.length - 1 : 0
  const steps = trace?.steps.length ?? 0
  const disabled = !trace || steps === 0

  return (
    <div className="timeline">
      <div className="transport" role="group" aria-label="Playback">
        <button type="button" className="icon-button" onClick={() => onSeek(0)} disabled={disabled || cursor === 0} aria-label="Go to start" title="Start"><SkipStartIcon size={16} /></button>
        <button type="button" className="icon-button" onClick={() => onSeek(cursor - 1)} disabled={disabled || cursor === 0} aria-label="Step back" title="Step back (Alt + Left arrow)"><StepBackIcon size={16} /></button>
        {playing ? (
          <button type="button" className="icon-button is-primary" onClick={onPause} aria-label="Pause" title="Pause"><PauseIcon size={18} /></button>
        ) : (
          <button type="button" className="icon-button is-primary" onClick={onPlay} disabled={disabled} aria-label="Play proof" title="Play (Ctrl + Enter)"><PlayIcon size={18} /></button>
        )}
        <button type="button" className="icon-button" onClick={() => onSeek(cursor + 1)} disabled={disabled || cursor >= last} aria-label="Step forward" title="Step forward (Alt + Right arrow)"><StepForwardIcon size={16} /></button>
        <button type="button" className="icon-button" onClick={() => onSeek(last)} disabled={disabled || cursor >= last} aria-label="Go to end" title="End"><SkipEndIcon size={16} /></button>
      </div>
      <div className="scrubber">
        <input
          type="range"
          min={0}
          max={Math.max(last, 1)}
          value={cursor}
          disabled={disabled}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="Move number"
          style={{ ['--progress' as string]: `${last > 0 ? (cursor / last) * 100 : 0}%` }}
        />
        <div className="scrubber-ticks" aria-hidden="true">
          {trace?.steps.slice(0, last + (trace.failedAt ? 1 : 0)).map((step, index) => (
            <span
              key={index}
              className={`tick tick-${step.move.kind}${trace.failedAt?.stepIndex === index ? ' is-failing' : ''}${index < cursor ? ' is-done' : ''}`}
              style={{ left: `${(Math.min(index + 1, last) / Math.max(last, 1)) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <output className="timeline-count">{cursor}<span>/{last}</span></output>
    </div>
  )
}
