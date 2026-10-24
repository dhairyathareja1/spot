import { useCallback, useEffect, useState } from 'react'
import { HomeScreen } from './ui/HomeScreen'
import { PlayScreen } from './ui/PlayScreen'
import { Workshop } from './ui/Workshop'
import { puzzleForRoute } from './ui/puzzles'
import { routeHref, useRoute } from './ui/router'
import { setSoundEnabled } from './ui/sound'
import { loadProgress, saveProgress, type SavedProgress, type Settings } from './ui/storage'
import './ui/styles.css'

function App() {
  const route = useRoute()
  const [progress, setProgress] = useState(loadProgress)

  useEffect(() => saveProgress(progress), [progress])
  useEffect(() => setSoundEnabled(progress.settings.sound), [progress.settings.sound])
  useEffect(() => {
    document.documentElement.dataset.motion = progress.settings.reducedMotion ? 'reduced' : 'full'
  }, [progress.settings.reducedMotion])

  const updateProgress = useCallback((update: (current: SavedProgress) => SavedProgress) => setProgress(update), [])
  const updateSettings = useCallback((settings: Settings) => setProgress((current) => ({ ...current, settings })), [])

  const puzzle = puzzleForRoute(route)
  const sharedProof = route.screen === 'level' || route.screen === 'custom' ? route.proof : undefined

  return (
    <div className="app-shell">
      <nav className="top-bar" aria-label="Main">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
          Proof Puzzle
        </a>
        <div className="top-links">
          <a href="#/" className={route.screen === 'home' ? 'is-active' : ''}>Levels</a>
          <a href="#/daily" className={route.screen === 'daily' ? 'is-active' : ''}>Daily</a>
          <a href="#/workshop" className={route.screen === 'workshop' ? 'is-active' : ''}>Workshop</a>
          <button
            type="button"
            className="icon-button"
            onClick={() => updateSettings({ ...progress.settings, sound: !progress.settings.sound })}
            aria-label={progress.settings.sound ? 'Mute sound' : 'Turn sound on'}
            title={progress.settings.sound ? 'Sound on' : 'Sound off'}
          >
            {progress.settings.sound ? '♪' : '∅'}
          </button>
        </div>
      </nav>

      {route.screen === 'home' && <HomeScreen progress={progress} onSettings={updateSettings} />}
      {route.screen === 'workshop' && <Workshop key={route.data ?? 'new'} data={route.data} />}
      {route.screen !== 'home' && route.screen !== 'workshop' && (
        puzzle ? (
          <PlayScreen
            key={`${puzzle.key}:${sharedProof ?? ''}`}
            puzzle={puzzle}
            progress={progress}
            onProgress={updateProgress}
            sharedProof={sharedProof}
          />
        ) : (
          <div className="not-found">
            <h1>Puzzle not found</h1>
            <p>This link does not point to a puzzle we know.</p>
            <a className="button button-primary" href={routeHref({ screen: 'home' })}>Back to levels</a>
          </div>
        )
      )}

      <footer className="site-footer">
        <p>Proof Puzzle · Syntax &apos;26 · Functional Programming track</p>
        <p>Pure TypeScript engine · Lean 4 verified levels</p>
      </footer>
    </div>
  )
}

export default App
