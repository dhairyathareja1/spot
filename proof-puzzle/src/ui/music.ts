/**
 * Background music made live in the browser with the Web Audio API, so the site ships no audio
 * files. A slow four-chord loop: soft pad chords, a light arpeggio with an echo, and a bass note.
 */

const TEMPO = 84
const EIGHTH = 60 / TEMPO / 2
const LOOK_AHEAD = 0.5

// Cmaj7, Am7, Fmaj7, G6, as MIDI note numbers.
const chords = [
  [48, 52, 55, 59],
  [45, 48, 52, 55],
  [41, 45, 48, 52],
  [43, 47, 50, 52],
]
const arpeggio = [0, 1, 2, 3, 2, 1, 2, 3]

let context: AudioContext | undefined
let master: GainNode | undefined
let echo: GainNode | undefined
let timer: number | undefined
let nextTime = 0
let step = 0

const frequency = (note: number) => 440 * 2 ** ((note - 69) / 12)

function setup(): AudioContext | undefined {
  if (typeof window === 'undefined') return undefined
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return undefined
  if (context) return context

  context = new AudioContextClass()
  master = context.createGain()
  master.gain.value = 0
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 2200
  master.connect(filter).connect(context.destination)

  // A simple echo for the arpeggio: delay fed back into itself.
  echo = context.createGain()
  const delay = context.createDelay()
  delay.delayTime.value = EIGHTH * 3
  const feedback = context.createGain()
  feedback.gain.value = 0.28
  echo.connect(delay)
  delay.connect(feedback).connect(delay)
  delay.connect(master)
  return context
}

function note(ctx: AudioContext, midi: number, start: number, length: number, volume: number, type: OscillatorType, withEcho = false) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency(midi)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.4, length / 3))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  oscillator.connect(gain).connect(master!)
  if (withEcho) gain.connect(echo!)
  oscillator.start(start)
  oscillator.stop(start + length + 0.05)
}

function schedule() {
  const ctx = context
  if (!ctx) return
  while (nextTime < ctx.currentTime + LOOK_AHEAD) {
    const bar = Math.floor(step / 8) % chords.length
    const beat = step % 8
    const chord = chords[bar]

    if (beat === 0) {
      for (const tone of chord) note(ctx, tone + 12, nextTime, EIGHTH * 8.5, 0.05, 'sine')
      note(ctx, chord[0] - 12, nextTime, EIGHTH * 3.5, 0.11, 'triangle')
    }
    if (beat === 4) note(ctx, chord[0] - 12, nextTime, EIGHTH * 3.5, 0.08, 'triangle')
    note(ctx, chord[arpeggio[beat]] + 24, nextTime, EIGHTH * 1.6, 0.035, 'triangle', true)

    nextTime += EIGHTH
    step += 1
  }
}

export function startMusic() {
  const ctx = setup()
  if (!ctx || !master || timer !== undefined) return
  if (ctx.state === 'suspended') void ctx.resume()
  nextTime = ctx.currentTime + 0.1
  step = 0
  master.gain.cancelScheduledValues(ctx.currentTime)
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
  master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2)
  schedule()
  timer = window.setInterval(schedule, 120)
}

export function stopMusic() {
  if (!context || !master || timer === undefined) return
  const now = context.currentTime
  master.gain.cancelScheduledValues(now)
  master.gain.setValueAtTime(master.gain.value, now)
  master.gain.linearRampToValueAtTime(0, now + 0.6)
  window.clearInterval(timer)
  timer = undefined
}

export function isMusicPlaying() {
  return timer !== undefined
}
