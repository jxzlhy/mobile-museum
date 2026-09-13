import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Timeline page choreography (spec §20–§22):
//   Mobile  → vertical scroll, nodes revealed as they enter.
//   Desktop → the decades run horizontally, wheel drives the room.

gsap.registerPlugin(ScrollTrigger)

export interface TimelineAnimationOptions {
  trackEl: HTMLElement
  reduced: boolean
}

export class TimelineAnimation {
  private mm: gsap.MatchMedia | null = null

  constructor(private opts: TimelineAnimationOptions) {
    this.init()
  }

  private init() {
    const { trackEl, reduced } = this.opts
    const nodes = trackEl.querySelectorAll<HTMLElement>('.tl-node')

    this.mm = gsap.matchMedia()

    // ---- Desktop: spatial horizontal walk ----
    this.mm.add('(min-width: 1080px)', () => {
      if (reduced) {
        gsap.set(trackEl, { x: 0 })
        return
      }
      const distance = () => Math.max(0, trackEl.scrollWidth - window.innerWidth)
      const tween = gsap.to(trackEl, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: trackEl.closest('.tl-wrap') ?? trackEl,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
        gsap.set(trackEl, { x: 0 })
      }
    })

    // ---- Mobile + fallback: gentle reveal ----
    this.mm.add('(max-width: 1079px)', () => {
      if (reduced || nodes.length === 0) return
      const tweens = Array.from(nodes).map((node) =>
        gsap.fromTo(
          node,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: { trigger: node, start: 'top 88%', once: true },
          },
        ),
      )
      return () => tweens.forEach((t) => {
        t.scrollTrigger?.kill()
        t.kill()
      })
    })
  }

  destroy() {
    this.mm?.revert()
    this.mm = null
  }
}
