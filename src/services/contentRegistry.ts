import { phoneService } from './phoneService'
import { brandService } from './brandService'
import { storyService } from './storyService'
import { getJourneys } from '@/data/journeys'
import { getScenesData } from '@/data/scenes'
import { getTechnologiesData } from '@/data/technologies'
import { eventService } from './eventService'

// ============================================================
// Content Registry（V0.9 规范 §14）：
// 统一内容注册表 —— Deep Link / Share / Import / Resume 的
// 引用合法性都从这里校验，避免白屏。
// ============================================================

export const contentRegistry = {
  async hasPhone(id: string): Promise<boolean> {
    return Boolean(await phoneService.getPhoneById(id))
  },

  async hasBrand(id: string): Promise<boolean> {
    const brand = await brandService.getBrandById(id)
    return Boolean(brand)
  },

  async hasStory(id: string): Promise<boolean> {
    const stories = await storyService.getStories()
    return stories.some((s) => s.id === id)
  },

  hasJourney(id: string): boolean {
    return getJourneys().some((j) => j.id === id)
  },

  hasTechnology(id: string): boolean {
    return getTechnologiesData().some((t) => t.id === id)
  },

  async hasEvent(id: string): Promise<boolean> {
    const events = await eventService.getEvents()
    return events.some((e) => e.id === id)
  },

  hasScene(id: string): boolean {
    return getScenesData().some((s) => s.id === id)
  },

  /** 校验 share/import payload 里的任意引用 id（如 phone:x / brand:y）。 */
  async hasRef(refId: string): Promise<boolean> {
    if (!refId.includes(':')) return false
    const [type, ...rest] = refId.split(':')
    const id = rest.join(':')
    switch (type) {
      case 'phone':
        return this.hasPhone(id)
      case 'brand':
        return this.hasBrand(id)
      case 'story':
        return this.hasStory(id)
      case 'technology':
        return this.hasTechnology(id)
      case 'era':
        return /^[0-9]{4}s$/.test(id)
      case 'form-factor':
        return true // formFactors 数据静态完整
      default:
        return false
    }
  },
}
