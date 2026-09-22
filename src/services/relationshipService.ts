import { phoneService } from './phoneService'
import { technologies } from '@/data/technologies'
import { stories } from '@/data/stories'
import type { Phone } from '@/data/types'

// ============================================================
// Relationship Service（V0.6 规范 §46–§48）：
// 关系分为 computed（程序根据数据生成）与 curated（人工策展指定），
// 二者通过 basis 字段严格区分，调用方可解释、可降级。
// ============================================================

export type RelationBasis = 'computed' | 'curated'

export interface RelatedPhone {
  phone: Phone
  /** 关系种类（与 V0.4 museumService.ExhibitRelation 对齐，另含 technology）。 */
  relation:
    | 'successor'
    | 'predecessor'
    | 'same-brand'
    | 'same-era'
    | 'same-form'
    | 'same-story'
    | 'same-technology'
    | 'related'
  basis: RelationBasis
}

const byYear = (a: Phone, b: Phone) => a.releaseYear - b.releaseYear

/** 人工策展的关系（规范 §48）：如 DynaTAC → iPhone 只是「里程碑 related」，不冒充 successor。 */
const CURATED_PHONE_RELATIONS: Array<{ a: string; b: string; note?: string }> = [
  { a: 'motorola-dynatac-8000x', b: 'apple-iphone', note: '移动电话史上的两座里程碑（curated related，非继任关系）' },
  { a: 'nokia-3310', b: 'apple-iphone', note: '功能机图腾 → 智能机起点（curated related）' },
]

export const relationshipService = {
  async getSuccessors(phoneId: string): Promise<RelatedPhone[]> {
    const p = await phoneService.getPhoneById(phoneId)
    if (!p) return []
    const direct = await phoneService.resolveMany(p.successorIds ?? [])
    return direct.map((phone) => ({ phone, relation: 'successor' as const, basis: 'computed' as const }))
  },

  async getPredecessors(phoneId: string): Promise<RelatedPhone[]> {
    const p = await phoneService.getPhoneById(phoneId)
    if (!p) return []
    const direct = await phoneService.resolveMany(p.predecessorIds ?? [])
    return direct.map((phone) => ({ phone, relation: 'predecessor' as const, basis: 'computed' as const }))
  },

  async getRelatedByBrand(phoneId: string): Promise<RelatedPhone[]> {
    const all = await phoneService.getPhones()
    const p = all.find((v) => v.id === phoneId)
    if (!p) return []
    return all
      .filter((v) => v.id !== phoneId && v.brandId === p.brandId)
      .map((phone) => ({ phone, relation: 'same-brand' as const, basis: 'computed' as const }))
  },

  async getRelatedByEra(phoneId: string): Promise<RelatedPhone[]> {
    const all = await phoneService.getPhones()
    const p = all.find((v) => v.id === phoneId)
    if (!p) return []
    return all
      .filter((v) => v.id !== phoneId && v.eraId === p.eraId)
      .map((phone) => ({ phone, relation: 'same-era' as const, basis: 'computed' as const }))
  },

  async getRelatedByTechnology(phoneId: string): Promise<RelatedPhone[]> {
    const all = await phoneService.getPhones()
    const p = all.find((v) => v.id === phoneId)
    if (!p) return []
    const tags = p.technologies ?? []
    if (tags.length === 0) return []
    return all
      .filter(
        (v) =>
          v.id !== phoneId &&
          (v.technologies ?? []).some((t) => tags.some((tag) => t.includes(tag) || tag.includes(t))),
      )
      .map((phone) => ({ phone, relation: 'same-technology' as const, basis: 'computed' as const }))
  },

  /** 同一专题（story.featuredPhoneIds 收录同一台手机）。 */
  getRelatedStories(phoneId: string): Array<{ storyId: string; storyTitle: string; storyTitleZh: string }> {
    return stories
      .filter((s) => (s.featuredPhoneIds ?? []).includes(phoneId))
      .map((s) => ({ storyId: s.id, storyTitle: s.title, storyTitleZh: s.titleZh }))
  },

  /** 涉及该手机的历史事件（event.relatedPhones，computed）。 */
  async getRelatedEvents(phoneId: string): Promise<Array<{ eventId: string; year: number; title: string }>> {
    const eventService = await import('./eventService').then((m) => m.eventService)
    const events = await eventService.getEventsForPhone(phoneId)
    return events.map((e) => ({ eventId: e.id, year: e.year, title: e.title }))
  },

  /** 汇总一台手机的全部关系（去重，保留最高优先级关系，§72 顺序）。 */
  async getAllRelations(phoneId: string): Promise<RelatedPhone[]> {
    const [
      successors,
      predecessors,
      byBrand,
      byEra,
      byTech,
    ] = await Promise.all([
      this.getSuccessors(phoneId),
      this.getPredecessors(phoneId),
      this.getRelatedByBrand(phoneId),
      this.getRelatedByEra(phoneId),
      this.getRelatedByTechnology(phoneId),
    ])
    const picked = new Map<string, RelatedPhone>()
    const put = (items: RelatedPhone[]) => {
      for (const item of items) {
        if (item.phone.id === phoneId) continue
        if (!picked.has(item.phone.id)) picked.set(item.phone.id, item)
      }
    }
    put(successors)
    put(predecessors)
    put(byBrand)
    put(byEra)
    put(byTech)
    // curated related
    for (const cur of CURATED_PHONE_RELATIONS) {
      const other = cur.a === phoneId ? cur.b : cur.b === phoneId ? cur.a : null
      if (!other || picked.has(other)) continue
      const phone = await phoneService.getPhoneById(other)
      if (phone) picked.set(other, { phone, relation: 'related', basis: 'curated' })
    }
    return [...picked.values()]
  },
}
