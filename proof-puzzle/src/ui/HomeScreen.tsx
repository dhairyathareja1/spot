import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { compile, isCompileSuccess } from '../engine/compile'
import type { Difficulty } from '../engine/random'
import { chapters, findLevel, levels, levelsInChapter } from '../levels/levels'
import { BoardView } from './BoardView'
import { getBlockMotionState } from './blockMotionState'
import { randomSeed } from './puzzles'
import { routeHref } from './router'
import { levelKey, type SavedProgress, type Settings } from './storage'

type HomeScreenProps = {
  progress: SavedProgress
  onSettings: (settings: Settings) => void
}

export function HomeScreen({ progress, onSettings }: HomeScreenProps) {
  const cleared = levels.filter((level) => progress.cleared.includes(levelKey(level.id))).length
  const stars = levels.reduce((total, level) => total + (progress.bestStars[levelKey(level.id)] ?? 0), 0)
  const nextLevel = levels.find((level) => !progress.cleared.includes(levelKey(level.id))) ?? levels[0]
  const started = cleared > 0 || Object.keys(progress.drafts).length > 0

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Functional programming · Lean 4</p>
          <h1 className="hero-title">
            Prove your way<br />to the picture.
          </h1>
          <p className="hero-lead">
            A grid of blocks, a target picture, and a proof. Every line you write is a move: <code>swap</code>,{' '}
            <code>paint</code> or <code>rotate</code>. Later you name patterns with <code>def</code> and fold them into{' '}
            <code>for</code> loops. Every proof you write also checks in real Lean 4.
          </p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href={routeHref({ screen: 'level', id: nextLevel.id })}>
              {started ? `Continue · Level ${nextLevel.id}` : 'Start playing'} →
            </a>
            <a className="button button-large" href="#/daily">Daily challenge</a>
          </div>
          <dl className="hero-stats">
            <div><dt>Levels proved</dt><dd>{cleared}<span>/{levels.length}</span></dd></div>
            <div><dt>Stars</dt><dd>{stars}<span>/{levels.length * 3}</span></dd></div>
            <div><dt>Lean-verified levels</dt><dd>{levels.length}<span>/{levels.length}</span></dd></div>
          </dl>
        </div>
        <HeroDemo />
      </section>

      {chapters.map((chapter) => (
        <section className="chapter" key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}>
          <header className="chapter-header">
            <span className="chapter-number">{String(chapter.id).padStart(2, '0')}</span>
            <div>
              <h2 id={`chapter-${chapter.id}`}>{chapter.title}</h2>
              <p>{chapter.tagline}</p>
            </div>
            <span className="chapter-progress">
              {levelsInChapter(chapter.id).filter((level) => progress.cleared.includes(levelKey(level.id))).length}
              /{levelsInChapter(chapter.id).length}
            </span>
          </header>
          <div className="level-grid">
            {levelsInChapter(chapter.id).map((level, index) => {
              const key = levelKey(level.id)
              const levelStars = progress.bestStars[key] ?? 0
              const done = progress.cleared.includes(key)
              return (
                <motion.a
                  key={level.id}
                  className={`level-card${done ? ' is-done' : ''}${level.id === nextLevel.id ? ' is-next' : ''}`}
                  href={routeHref({ screen: 'level', id: level.id })}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <span className="level-card-top">
                    <span className="level-number">{level.id}</span>
                    <span className="stars-inline" aria-label={`${levelStars} of 3 stars`}>
                      {[1, 2, 3].map((star) => <span key={star} className={star <= levelStars ? 'is-earned' : ''}>★</span>)}
                    </span>
                  </span>
                  <span className={`level-card-boards${level.start.cols >= 5 ? ' is-wide' : ''}`} aria-hidden="true">
                    <BoardView board={level.start} size="sm" />
                    <span className="level-card-arrow">→</span>
                    <BoardView board={level.target} size="sm" />
                  </span>
                  <span className="level-card-title">{level.title}</span>
                  {level.concept && <span className="level-card-concept">{level.concept.title}</span>}
                </motion.a>
              )
            })}
          </div>
        </section>
      ))}

      <section className="extras" aria-label="More puzzles">
        <a className="extra-card extra-daily" href="#/daily">
          <span className="extra-icon" aria-hidden="true">☀</span>
          <h3>Daily challenge</h3>
          <p>One generated puzzle a day, the same for everyone. Helpers and loops allowed.</p>
        </a>
        <div className="extra-card">
          <span className="extra-icon" aria-hidden="true">⚄</span>
          <h3>Endless puzzles</h3>
          <p>Seeded puzzles with a solver-computed par. Try to beat it.</p>
          <div className="extra-actions">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((difficulty) => (
              <a key={difficulty} className="chip" href={routeHref({ screen: 'random', difficulty, seed: randomSeed() })}>{difficulty}</a>
            ))}
          </div>
        </div>
        <a className="extra-card" href="#/workshop">
          <span className="extra-icon" aria-hidden="true">✎</span>
          <h3>Workshop</h3>
          <p>Design your own start and target boards and share the puzzle as a link.</p>
        </a>
      </section>

      <section className="lean-callout">
        <div>
          <p className="eyebrow">Not just Lean-flavored</p>
          <h2>Your proofs are real Lean 4.</h2>
          <p>
            The game ships a small Lean library where <code>swap</code>, <code>paint</code>, <code>rotate</code> and{' '}
            <code>for</code> are genuine tactics over an inductive <code>Solve</code> relation. Each move is checked by{' '}
            <code>rfl</code>, so an illegal move fails in Lean on exactly the line where the game turns a block red.
            Export any proof with one click and open it in the Lean 4 web editor.
          </p>
        </div>
        <pre className="lean-snippet"><code>{`inductive Solve : Board → Board → Prop where
  | done : b.faces = t.faces → Solve b t
  | step (m : Move) :
      m.apply b = some b' → Solve b' t → Solve b t

theorem level16 : Solve start target := by
  for i in [0:8] do paint i teal`}</code></pre>
      </section>

      <section className="settings" aria-label="Settings">
        <h2>Settings</h2>
        <label className="toggle">
          <input type="checkbox" checked={progress.settings.sound} onChange={(event) => onSettings({ ...progress.settings, sound: event.target.checked })} />
          <span>Sound effects</span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={progress.settings.colorLabels} onChange={(event) => onSettings({ ...progress.settings, colorLabels: event.target.checked })} />
          <span>Color letters on blocks (color-blind friendly)</span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={progress.settings.reducedMotion} onChange={(event) => onSettings({ ...progress.settings, reducedMotion: event.target.checked })} />
          <span>Reduce motion</span>
        </label>
      </section>
    </div>
  )
}

const demoLevel = findLevel(7)!

function HeroDemo() {
  const trace = useMemo(() => {
    const result = compile(demoLevel, demoLevel.solution)
    return isCompileSuccess(result) ? result.trace : undefined
  }, [])
  const [cursor, setCursor] = useState(0)
  const last = trace ? trace.states.length - 1 : 0

  useEffect(() => {
    const timer = window.setTimeout(() => setCursor((current) => (current >= last ? 0 : current + 1)), cursor >= last ? 2600 : 1100)
    return () => window.clearTimeout(timer)
  }, [cursor, last])

  if (!trace) return null
  const motionState = getBlockMotionState('demo', demoLevel.start, trace, cursor)
  const lines = demoLevel.solution.split('\n')
  const activeLine = cursor > 0 ? trace.steps[cursor - 1].line : -1
  const solved = cursor === last

  return (
    <div className="hero-demo" aria-hidden="true">
      <div className="demo-window">
        <div className="demo-bar"><span /><span /><span /><em>level7.lean</em></div>
        <pre className="demo-code">
          {lines.map((line, index) => (
            <span key={index} className={`demo-line${index === activeLine ? ' is-active' : ''}${index > 0 && index > activeLine ? ' is-pending' : ''}`}>
              {line}
              {'\n'}
            </span>
          ))}
        </pre>
      </div>
      <div className="demo-boards">
        <div className={`demo-board${solved ? ' is-solved' : ''}`}>
          <BoardView board={trace.states[cursor]} blockIds={motionState.blockIds} rotationDegrees={motionState.rotationDegrees} animated size="lg" />
        </div>
        <div className="demo-target">
          <span>target</span>
          <BoardView board={demoLevel.target} size="sm" />
        </div>
      </div>
      <p className={`demo-status${solved ? ' is-solved' : ''}`}>{solved ? 'Q.E.D. ✓' : `${trace.distance[cursor]} cells to go`}</p>
    </div>
  )
}
