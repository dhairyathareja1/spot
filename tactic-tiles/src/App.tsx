import { useCallback, useEffect, useState } from 'react'
import { HomeScreen } from './ui/HomeScreen'
import { MusicIcon, MusicOffIcon, SoundIcon, SoundOffIcon } from './ui/Icons'
import { PlayScreen } from './ui/PlayScreen'
import { Workshop } from './ui/Workshop'
import { startMusic, stopMusic } from './ui/music'
import { puzzleForRoute } from './ui/puzzles'
import { routeHref, useRoute } from './ui/router'
import { setSoundEnabled } from './ui/sound'
import { loadProgress, saveProgress, type SavedProgress, type Settings } from './ui/storage'
import './ui/styles.css'

function App() {
  const route = useRoute()
  const [progress, setProgress] = useState(loadProgress)
  const { settings } = progress

  useEffect(() => saveProgress(progress), [progress])
  useEffect(() => setSoundEnabled(settings.sound), [settings.sound])

  // browsers block audio until the user clicks or presses a key
  useEffect(() => {
    if (!settings.music) {
      stopMusic()
      return
    }
    const begin = () => startMusic()
    window.addEventListener('pointerdown', begin, { once: true })
    window.addEventListener('keydown', begin, { once: true })
    return () => {
      window.removeEventListener('pointerdown', begin)
      window.removeEventListener('keydown', begin)
    }
  }, [settings.music])

  const updateProgress = useCallback((update: (current: SavedProgress) => SavedProgress) => setProgress(update), [])
  const updateSettings = (next: Settings) => setProgress((current) => ({ ...current, settings: next }))

  function toggleMusic() {
    const music = !settings.music
    if (music) startMusic()
    else stopMusic()
    updateSettings({ ...settings, music })
  }

  const puzzle = puzzleForRoute(route)
  const sharedProof = route.screen === 'level' || route.screen === 'custom' ? route.proof : undefined

  return (
    <div className="app-shell">
      <nav className="top-bar" aria-label="Main">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
          Tactic Tiles
        </a>
        <div className="top-links">
          <a href="#/" className={route.screen === 'home' ? 'is-active' : ''}>Levels</a>
          <a href="#/daily" className={route.screen === 'daily' ? 'is-active' : ''}>Daily</a>
          <a href="#/workshop" className={route.screen === 'workshop' ? 'is-active' : ''}>Make</a>
          <button
            type="button"
            className={`icon-button${settings.music ? ' is-on' : ''}`}
            onClick={toggleMusic}
            aria-pressed={settings.music}
            aria-label={settings.music ? 'Turn music off' : 'Turn music on'}
            title={settings.music ? 'Music on' : 'Music off'}
          >
            {settings.music ? <MusicIcon /> : <MusicOffIcon />}
          </button>
          <button
            type="button"
            className={`icon-button${settings.sound ? ' is-on' : ''}`}
            onClick={() => updateSettings({ ...settings, sound: !settings.sound })}
            aria-pressed={settings.sound}
            aria-label={settings.sound ? 'Turn sound effects off' : 'Turn sound effects on'}
            title={settings.sound ? 'Sound effects on' : 'Sound effects off'}
          >
            {settings.sound ? <SoundIcon /> : <SoundOffIcon />}
          </button>
        </div>
      </nav>

      {route.screen === 'home' && <HomeScreen progress={progress} />}
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
            <p>This link does not lead to a puzzle.</p>
            <a className="button button-primary" href={routeHref({ screen: 'home' })}>Back to levels</a>
          </div>
        )
      )}
    </div>
  )
}

export default App
