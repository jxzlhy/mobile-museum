import { gsap } from 'gsap'

// EVOLUTION 时间轴控制（V0.3 §47 / §8 / §72）：
// 拖动/键盘 → 年份吸附 → 回调切换节点。
// Reduced Motion：切换不做补间，直接替换（由视图层 CSS 处理）。

export interface EvolutionTimelineOptions {
  input: HTMLInputElement
  min: number
  max: number
  initial: number
  reduced: boolean
  onYear: (year: number) => void
}

export class EvolutionTimeline {
  private input: HTMLInputElement
  private onYear: (year: number) => void
  private reduced: boolean
  private tween: gsap.core.Tween | null = null

  constructor(opts: EvolutionTimelineOptions) {
    this.input = opts.input
    this.onYear = opts.onYear
    this.reduced = opts.reduced
    this.input.min = String(opts.min)
    this.input.max = String(opts.max)
    this.input.value = String(opts.initial)
    this.input.addEventListener('input', this.handleInput)
  }

  private handleInput = () => {
    this.onYear(Number(this.input.value))
  }

  /** 年份跳转（年代快捷键 / URL 恢复）。reduced 或跨年远时直接跳。 */
  setYear(year: number, opts: { animate?: boolean } = {}) {
    const current = Number(this.input.value)
    const target = Math.min(Number(this.input.max), Math.max(Number(this.input.min), year))
    const animate = opts.animate ?? !this.reduced
    if (!animate || Math.abs(target - current) > 20) {
      this.input.value = String(target)
      this.onYear(target)
      return
    }
    this.tween?.kill()
    const obj = { v: current }
    this.tween = gsap.to(obj, {
      v: target,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        this.input.value = String(Math.round(obj.v))
        this.onYear(Math.round(obj.v))
      },
    })
  }

  destroy() {
    this.input.removeEventListener('input', this.handleInput)
    this.tween?.kill()
  }
}
