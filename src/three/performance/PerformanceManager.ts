// Performance tiering (spec §54–§56). Decides LOW / MEDIUM / HIGH from
// device signals at startup, then watches FPS at runtime and can
// downgrade to keep the main scenes fluid.

export type QualityTier = 'low' | 'medium' | 'high'

export interface QualityProfile {
  tier: QualityTier
  dprCap: number
  particles: number
  shadowMapSize: number // 0 = shadows off
  antialias: boolean
}

function initialTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'medium'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 4
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false

  if (coarse) {
    if (cores <= 4 || memory <= 2) return 'low'
    return 'medium'
  }
  if (cores >= 8 && memory >= 8) return 'high'
  if (cores <= 4 || memory <= 4) return 'low'
  return 'medium'
}

const PROFILES: Record<QualityTier, QualityProfile> = {
  low: { tier: 'low', dprCap: 1.25, particles: 70, shadowMapSize: 0, antialias: false },
  medium: { tier: 'medium', dprCap: 1.6, particles: 160, shadowMapSize: 1024, antialias: true },
  high: { tier: 'high', dprCap: 2, particles: 320, shadowMapSize: 2048, antialias: true },
}

class PerformanceManagerImpl {
  private tier: QualityTier = 'medium'
  private listeners: Array<(t: QualityTier) => void> = []

  // FPS monitoring state
  private accumFrames = 0
  private accumTime = 0
  private recentLow = 0
  private cooldown = 0

  readonly isMobile: boolean =
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true

  constructor() {
    this.tier = initialTier()
  }

  get profile(): QualityProfile {
    return PROFILES[this.tier]
  }

  get currentTier(): QualityTier {
    return this.tier
  }

  onTierChange(cb: (t: QualityTier) => void) {
    this.listeners.push(cb)
  }

  setTier(t: QualityTier) {
    if (t === this.tier) return
    this.tier = t
    this.cooldown = 8
    this.listeners.forEach((cb) => cb(t))
  }

  /** Feed the frame time every rendered frame. */
  sample(dt: number) {
    this.accumFrames += 1
    this.accumTime += dt

    if (this.accumTime < 2) return

    const fps = this.accumFrames / this.accumTime
    this.accumFrames = 0
    this.accumTime = 0

    if (this.cooldown > 0) {
      this.cooldown -= 2
      return
    }

    if (fps < 42) {
      this.recentLow += 1
      if (this.recentLow >= 2) {
        this.recentLow = 0
        if (this.tier === 'high') this.setTier('medium')
        else if (this.tier === 'medium') this.setTier('low')
      }
    } else {
      this.recentLow = 0
    }
  }
}

export const performanceManager = new PerformanceManagerImpl()
