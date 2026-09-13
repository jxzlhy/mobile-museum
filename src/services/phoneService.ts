import { phones } from '@/data/phones'
import type { Phone } from '@/data/types'

// Service layer（规范 §9 / §58 / §59）：视图永远不直接触碰数据文件。
// 全部 async —— 数据源未来可无缝替换为 REST / GraphQL / CMS。

const byYear = (a: Phone, b: Phone) => a.releaseYear - b.releaseYear

export const phoneService = {
  async getPhones(): Promise<Phone[]> {
    return [...phones].sort(byYear)
  },

  async getPhoneById(id: string): Promise<Phone | undefined> {
    return phones.find((p) => p.id === id)
  },

  async getPhonesByBrand(brandId: string): Promise<Phone[]> {
    return phones.filter((p) => p.brandId === brandId).sort(byYear)
  },

  async getPhonesByYear(year: number): Promise<Phone[]> {
    return phones.filter((p) => p.releaseYear === year).sort(byYear)
  },

  async getPhonesByEra(eraId: string): Promise<Phone[]> {
    return phones.filter((p) => p.eraId === eraId).sort(byYear)
  },

  async getPhonesByFormFactor(type: string): Promise<Phone[]> {
    return phones.filter((p) => p.formFactor === type).sort(byYear)
  },

  async getPhonesByTechnology(tag: string): Promise<Phone[]> {
    return phones.filter((p) => (p.technologies ?? []).some((t) => t.includes(tag))).sort(byYear)
  },

  async getFeaturedPhones(): Promise<Phone[]> {
    return phones.filter((p) => p.exhibitLevel >= 2).sort(byYear)
  },

  async getTreasurePhones(): Promise<Phone[]> {
    return phones.filter((p) => p.exhibitLevel === 3).sort(byYear)
  },

  async getRelated(phone: Phone): Promise<Phone[]> {
    const ids = new Set(phone.relatedPhoneIds ?? [])
    const direct = phones.filter((p) => ids.has(p.id) && p.id !== phone.id)
    if (direct.length > 0) return direct.sort(byYear)
    // 回退：同品牌 / 同年代 / 同形态（规范 §79）
    return phones
      .filter(
        (p) =>
          p.id !== phone.id &&
          (p.brandId === phone.brandId ||
            p.eraId === phone.eraId ||
            p.formFactor === phone.formFactor),
      )
      .sort((a, b) => Number(b.exhibitLevel) - Number(a.exhibitLevel) || byYear(a, b))
      .slice(0, 4)
  },

  /** 上一台 / 下一台（按年份顺序，规范 §80）。 */
  async getAdjacent(id: string): Promise<{ prev?: Phone; next?: Phone }> {
    const sorted = await this.getPhones()
    const i = sorted.findIndex((p) => p.id === id)
    if (i < 0) return {}
    return {
      prev: i > 0 ? sorted[i - 1] : undefined,
      next: i < sorted.length - 1 ? sorted[i + 1] : undefined,
    }
  },

  async resolveMany(ids: string[]): Promise<Phone[]> {
    const map = new Map(phones.map((p) => [p.id, p]))
    return ids.map((id) => map.get(id)).filter((p): p is Phone => Boolean(p))
  },
}
