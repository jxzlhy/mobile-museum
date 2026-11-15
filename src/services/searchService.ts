import { phones } from '@/data/phones'
import { brands } from '@/data/brands'
import { technologies } from '@/data/technologies'
import { historicalScenes } from '@/data/scenes'
import type { Brand, Phone, Technology } from '@/data/types'

export interface SearchResult {
  phones: Phone[]
  brands: Brand[]
  technologies: Technology[]
  /** 历史场景（V0.7 §57：搜 2007 → Era / Scene）。 */
  scenes: Array<{ id: string; year: number; title: string; titleZh: string }>
  total: number
}

const includes = (haystack: string | undefined, needle: string) =>
  normalizeText(haystack).includes(normalizeText(needle))

/** 规范 §42：大小写 / 空格 / 全角半角归一化，支持中英文混搜。 */
export function normalizeText(input: string | undefined): string {
  return (input ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[（］【】]/g, (c) => ({ '（': '(', '）': ')', '【': '[', '】': ']' }[c] ?? c))
    .trim()
}

export const searchService = {
  // Synchronous by design: client-side search over the local dataset.
  // When the data layer becomes an API this moves behind the same
  // async interface used by the other services.
  search(query: string): SearchResult {
    const q = query.trim().toLowerCase()
    if (!q) return { phones: [], brands: [], technologies: [], scenes: [], total: 0 }

    const matchedPhones = phones.filter((p) => {
      return (
        includes(p.name, q) ||
        includes(p.brandName, q) ||
        includes(p.brandEn, q) ||
        includes(p.brandId, q.replace(/\s+/g, '-')) ||
        String(p.releaseYear).includes(q) ||
        includes(p.formFactor, q) ||
        includes(p.tagline, q) ||
        includes(p.story, q) ||
        includes(p.significance, q) ||
        includes(p.impact, q) ||
        includes(p.eraId, q) ||
        (p.technologies ?? []).some((t) => includes(t, q)) ||
        (p.specs?.network ?? []).some((n) => includes(n, q)) ||
        (p.tags ?? []).some((t) => includes(t, q))
      )
    })

    const matchedBrands = brands.filter(
      (b) => includes(b.name, q) || includes(b.country, q) || includes(b.description, q),
    )

    const matchedTech = technologies.filter(
      (t) =>
        includes(t.name, q) ||
        includes(t.category, q) ||
        includes(t.description, q) ||
        (t.milestones ?? []).some((m) => includes(m.label, q)),
    )

    // V0.7 §57：年份 / 场景标题 → Era / Scene
    const matchedScenes = historicalScenes.filter(
      (s) => String(s.year).includes(q) || includes(s.title, q) || includes(s.titleZh, q),
    )

    return {
      // 排序：名称命中 > 标语命中 > 其余；同分按年代（V0.2 §40 搜索质量）
      phones: matchedPhones
        .map((p) => ({ p, rank: includes(p.name, q) ? 2 : includes(p.tagline, q) ? 1 : 0 }))
        .sort((a, b) => b.rank - a.rank || a.p.releaseYear - b.p.releaseYear)
        .map((x) => x.p),
      brands: matchedBrands,
      technologies: matchedTech,
      scenes: matchedScenes.map((s) => ({ id: s.id, year: s.year, title: s.title, titleZh: s.titleZh })),
      total: matchedPhones.length + matchedBrands.length + matchedTech.length + matchedScenes.length,
    }
  },
}
