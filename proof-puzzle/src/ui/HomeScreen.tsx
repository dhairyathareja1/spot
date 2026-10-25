import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { compile, isCompileSuccess } from '../engine/compile'
import type { Difficulty } from '../engine/random'
import { chapters, findLevel, levels, levelsInChapter } from '../levels/levels'
import { BoardView } from './BoardView'
import { getBlockMotionState } from './blockMotionState'
import { chapterTint } from './colors'
import { ArrowRightIcon, CalendarIcon, PencilIcon, ShuffleIcon, Stars } from './Icons'
import { randomSeed } from './puzzles'
import { routeHref } from './router'
import { levelKey, type SavedProgress } from './storage'

type HomeScreenProps = {
  progress: SavedProgress
}

export function HomeScreen({ progress }: HomeScreenProps) {
  const cleared = levels.filter((level) => progress.cleared.includes(levelKey(level.id))).length
  const stars = levels.reduce((total, level) => total + (progress.bestStars[levelKey(level.id)] ?? 0), 0)
  const nextLevel = levels.find((level) => !progress.cleared.includes(levelKey(level.id))) ?? levels[0]
  const started = cleared > 0 || Object.keys(progress.drafts).length > 0

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A puzzle game about proofs</p>
          <h1 className="hero-title">Prove it!</h1>
          <h2 className="hero-subtitle">Match the picture by writing Lean&nbsp;4 proofs</h2>
          <p className="hero-lead">
            You get a grid of colored blocks and a picture to copy. Each line you write is one move:{' '}
            <code>swap</code>, <code>paint</code> or <code>rotate</code>. Later you learn to name a group of moves
            with <code>def</code> and repeat it with <code>for</code> loops. You can also export any proof and check it in Lean 4.
          </p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href={routeHref({ screen: 'level', id: nextLevel.id })}>
              {started ? `Continue: Level ${nextLevel.id}` : 'Start playing'} <ArrowRightIcon />
            </a>
            <a className="button button-large" href="#/daily">Daily puzzle</a>
          </div>
          <dl className="hero-stats">
            <div><dt>Levels solved</dt><dd>{cleared}<span>/{levels.length}</span></dd></div>
            <div><dt>Stars</dt><dd>{stars}<span>/{levels.length * 3}</span></dd></div>
            <div><dt>Checked in Lean</dt><dd>{levels.length}<span>/{levels.length}</span></dd></div>
          </dl>
        </div>
        <HeroDemo />
      </section>

      {chapters.map((chapter) => (
        <section className={`chapter tint-${chapterTint(chapter.id)}`} key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}>
          <header className="chapter-header">
            <span className="chapter-number">{String(chapter.id).padStart(2, '0')}</span>
            <div>
              <h2 id={`chapter-${chapter.id}`}>{chapter.title}</h2>
              <p>{chapter.tagline}</p>
            </div>
            <span className="chapter-progress">
              {levelsInChapter(chapter.id).filter((level) => progress.cleared.includes(levelKey(level.id))).length}
              /{levelsInChapter(chapter.id).length} solved
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
                    <Stars count={levelStars} />
                  </span>
                  <span className={`level-card-boards${level.start.cols >= 5 ? ' is-wide' : ''}`} aria-hidden="true">
                    <BoardView board={level.target} size="sm" />
                  </span>
                  <span className="level-card-title">{level.title}</span>
                  {level.concept && <span className="level-card-concept">New: {level.concept.title}</span>}
                </motion.a>
              )
            })}
          </div>
        </section>
      ))}

      <section className="extras" aria-label="More puzzles">
        <a className="extra-card extra-daily" href="#/daily">
          <span className="extra-icon"><CalendarIcon size={24} /></span>
          <h3>Daily puzzle</h3>
          <p>A new puzzle every day. Everyone gets the same one. Helpers and loops are allowed.</p>
        </a>
        <div className="extra-card">
          <span className="extra-icon"><ShuffleIcon size={24} /></span>
          <h3>Random puzzles</h3>
          <p>New puzzles made on the spot. Try to beat the computer's best score.</p>
          <div className="extra-actions">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((difficulty) => (
              <a key={difficulty} className="chip" href={routeHref({ screen: 'random', difficulty, seed: randomSeed() })}>{difficulty}</a>
            ))}
          </div>
        </div>
        <a className="extra-card" href="#/workshop">
          <span className="extra-icon"><PencilIcon size={24} /></span>
          <h3>Make your own</h3>
          <p>Draw a start board and a target, then share your puzzle with a link.</p>
        </a>
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
          <span>Target</span>
          <BoardView board={demoLevel.target} size="sm" />
        </div>
      </div>
      <p className={`demo-status${solved ? ' is-solved' : ''}`}>{solved ? 'Solved!' : `${trace.distance[cursor]} blocks left to fix`}</p>
    </div>
  )
}
