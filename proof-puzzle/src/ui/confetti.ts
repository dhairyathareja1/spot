const palette = ['#60a5fa', '#4ade80', '#facc15', '#c084fc', '#fb923c', '#2dd4bf']

type Particle = { x: number; y: number; vx: number; vy: number; size: number; color: string; spin: number; angle: number }

/** A dependency-free confetti burst drawn on a temporary full-screen canvas. */
export function burstConfetti(origin = { x: 0.5, y: 0.35 }, count = 140) {
  if (typeof document === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  canvas.className = 'confetti-canvas'
  canvas.width = window.innerWidth * devicePixelRatio
  canvas.height = window.innerHeight * devicePixelRatio
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }
  ctx.scale(devicePixelRatio, devicePixelRatio)

  const particles: Particle[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 4 + Math.random() * 9
    return {
      x: origin.x * window.innerWidth,
      y: origin.y * window.innerHeight,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6,
      size: 5 + Math.random() * 6,
      color: palette[Math.floor(Math.random() * palette.length)],
      spin: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI,
    }
  })

  const started = performance.now()
  const frame = (now: number) => {
    const elapsed = now - started
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    for (const particle of particles) {
      particle.vy += 0.25
      particle.vx *= 0.99
      particle.x += particle.vx
      particle.y += particle.vy
      particle.angle += particle.spin
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 2600)
      ctx.translate(particle.x, particle.y)
      ctx.rotate(particle.angle)
      ctx.fillStyle = particle.color
      ctx.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66)
      ctx.restore()
    }
    if (elapsed < 2600) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}
