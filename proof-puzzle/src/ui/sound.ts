type Tone = { frequency: number; duration: number; type?: OscillatorType; delay?: number; volume?: number }

let context: AudioContext | undefined
let enabled = true

export function setSoundEnabled(value: boolean) {
  enabled = value
}

function audio(): AudioContext | undefined {
  if (!enabled || typeof window === 'undefined') return undefined
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return undefined
  context ??= new AudioContextClass()
  if (context.state === 'suspended') void context.resume()
  return context
}

function play(tones: Tone[]) {
  const ctx = audio()
  if (!ctx) return
  for (const tone of tones) {
    const start = ctx.currentTime + (tone.delay ?? 0)
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = tone.type ?? 'sine'
    oscillator.frequency.setValueAtTime(tone.frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(tone.volume ?? 0.08, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration)
    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(start + tone.duration + 0.02)
  }
}

export const sounds = {
  move: (kind: 'swap' | 'paint' | 'rotate') =>
    play([{ frequency: kind === 'swap' ? 520 : kind === 'paint' ? 660 : 590, duration: 0.09, type: 'triangle' }]),
  error: () =>
    play([
      { frequency: 180, duration: 0.18, type: 'sawtooth', volume: 0.05 },
      { frequency: 140, duration: 0.22, type: 'sawtooth', volume: 0.05, delay: 0.09 },
    ]),
  click: () => play([{ frequency: 880, duration: 0.04, type: 'sine', volume: 0.04 }]),
  win: () =>
    play([523, 659, 784, 1047].map((frequency, index) => ({
      frequency,
      duration: 0.28,
      type: 'triangle' as const,
      delay: index * 0.09,
      volume: 0.07,
    }))),
}
