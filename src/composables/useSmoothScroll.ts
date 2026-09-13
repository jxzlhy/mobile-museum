import Lenis from 'lenis'

// Smooth scrolling singleton (spec §5). Reduced-motion visitors get
// native scrolling instead (spec §60).

let lenis: Lenis | null = null

export function createSmoothScroll(): Lenis {
  if (lenis) return lenis
  lenis = new Lenis({
    duration: 1.15,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  })
  return lenis
}

export function getSmoothScroll(): Lenis | null {
  return lenis
}

export function destroySmoothScroll() {
  lenis?.destroy()
  lenis = null
}
