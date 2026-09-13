import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { HomeScene, HomeScrollState } from '@/three/scenes/HomeScene'

// Home scroll choreography (spec §16–§18).
// Scroll → Camera → 3D Scene → Narrative.
// Every numeric parameter lives in the tables below — nothing is
// scattered through templates.

gsap.registerPlugin(ScrollTrigger)

// ---- Camera / hero keyframes (progress 0 → 1, spec §17) ----
interface Keyframe {
  p: number
  cam: [number, number, number]
  lookY: number
  rotY: number
  heroY: number
}

const KEYFRAMES: Keyframe[] = [
  { p: 0.0, cam: [0, 0.75, 12.5], lookY: 0.7, rotY: -0.55, heroY: 0 },
  { p: 0.2, cam: [0.45, 0.5, 9.4], lookY: 0.45, rotY: 0.35, heroY: 0.05 },
  { p: 0.4, cam: [-1.0, 0.32, 7.0], lookY: 0.2, rotY: 1.65, heroY: 0.1 },
  { p: 0.6, cam: [0.6, 0.1, 5.5], lookY: 0.1, rotY: 3.15, heroY: 0.15 },
  { p: 0.8, cam: [0.15, 0.3, 7.0], lookY: 0.15, rotY: 4.7, heroY: 0.1 },
  { p: 1.0, cam: [0, 0.2, 9.9], lookY: 0.3, rotY: 6.3, heroY: 0.55 },
]

// ---- 叙事阶段：年份 + 说明，在进度区间内可见 ----
export const HOME_PHASES = [
  { year: '1973', text: '第一次通话', from: 0.2, to: 0.38 },
  { year: '1983', text: '手机开始发售', from: 0.4, to: 0.56 },
  { year: '1994', text: '第一部智能手机', from: 0.58, to: 0.7 },
  { year: '2007', text: '触摸时代', from: 0.72, to: 0.84 },
  { year: '2026', text: 'AI 时代', from: 0.86, to: 0.98 },
]

const SCROLL_LENGTH = 3000 // px of pinned scroll (spec §18 example)
const REDUCED_SCROLL_LENGTH = 1800
const REDUCED_AMPLITUDE = 0.4 // camera/rotation amplitude multiplier

function sampleKeyframes(p: number, amplitude: number): HomeScrollState {
  const clamped = Math.min(1, Math.max(0, p))
  let a = KEYFRAMES[0]
  let b = KEYFRAMES[KEYFRAMES.length - 1]
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (clamped >= KEYFRAMES[i].p && clamped <= KEYFRAMES[i + 1].p) {
      a = KEYFRAMES[i]
      b = KEYFRAMES[i + 1]
      break
    }
  }
  const span = b.p - a.p || 1
  const t = (clamped - a.p) / span
  const ease = t * t * (3 - 2 * t) // smoothstep between keys
  const lerp = (x: number, y: number) => x + (y - x) * ease

  // Reduced motion pulls the camera toward its resting position.
  const mix = (v: number, rest: number) => rest + (v - rest) * amplitude

  return {
    camX: mix(lerp(a.cam[0], b.cam[0]), 0),
    camY: mix(lerp(a.cam[1], b.cam[1]), 0.35),
    camZ: mix(lerp(a.cam[2], b.cam[2]), 8.6),
    lookY: lerp(a.lookY, b.lookY),
    rotY: mix(lerp(a.rotY, b.rotY), -0.55),
    heroY: lerp(a.heroY, b.heroY),
  }
}

export interface HomeAnimationOptions {
  heroEl: HTMLElement
  scene: HomeScene | null
  reduced: boolean
}

export class HomeAnimation {
  private tl: gsap.core.Timeline | null = null

  constructor(private opts: HomeAnimationOptions) {
    this.init()
  }

  private init() {
    const { heroEl, scene, reduced } = this.opts
    const length = reduced ? REDUCED_SCROLL_LENGTH : SCROLL_LENGTH
    const amplitude = reduced ? REDUCED_AMPLITUDE : 1

    // 2) DOM narrative: headline out, year phases in/out (GSAP owns the DOM).
    const heroHead = heroEl.querySelector<HTMLElement>('.hero__head')
    const heroFoot = heroEl.querySelector<HTMLElement>('.hero__foot')
    const phases = Array.from(heroEl.querySelectorAll<HTMLElement>('.phase'))

    // ONE pinned trigger drives everything: DOM timeline + camera state.
    // (Two triggers on the same pinned element would offset the second
    // by the pin distance — the classic double-trigger trap.)
    this.tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroEl,
        start: 'top top',
        end: `+=${length}`,
        pin: true,
        anticipatePin: 1,
        scrub: reduced ? true : 0.6,
        onUpdate: (self) => {
          scene?.applyScrollState(sampleKeyframes(self.progress, amplitude))
        },
      },
    })

    scene?.applyScrollState(sampleKeyframes(0, amplitude))

    if (heroHead) {
      this.tl.to(heroHead, { opacity: 0, y: -40, filter: 'blur(6px)', duration: 0.12, ease: 'none' }, 0.04)
    }
    if (heroFoot) {
      this.tl.to(heroFoot, { opacity: 0, duration: 0.06, ease: 'none' }, 0)
    }

    phases.forEach((el, i) => {
      const phase = HOME_PHASES[i]
      if (!phase) return
      const fadeIn = Math.max(0.001, phase.from - 0.02)
      this.tl!.fromTo(
        el,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.04, ease: 'none' },
        fadeIn,
      )
      this.tl!.to(el, { opacity: 0, y: -30, duration: 0.04, ease: 'none' }, phase.to)
    })
  }

  destroy() {
    this.tl?.scrollTrigger?.kill()
    this.tl?.kill()
    this.tl = null
  }
}
