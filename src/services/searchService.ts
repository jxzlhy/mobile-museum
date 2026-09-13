import { phones } from '@/data/phones'
import { brands } from '@/data/brands'
import { technologies } from '@/data/technologies'
import type { Brand, Phone, Technology } from '@/data/types'

export interface SearchResult {
  phones: Phone[]
  brands: Brand[]
  technologies: Technology[]
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
    if (!q) return { phones: [], brands: [], technologies: [], total: 0 }

    const matchedPhones = phones.filter((p) => {
      return (
        includes(p.name, q) ||
        includes(p.brandName, q) ||
        includes(p.brandEn, q) ||
        includes(p.brandId, q.replace(/\s+/g, '-')) ||
        String(p.releaseYear).includes(q) ||
        includes(p.formFactor, q) ||
        includes(p.tagline, q) ||
        includes(p.eraId, q) ||
        (p.technologies ?? []).some((t) => includes(t, q)) ||
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

    return {
      phones: matchedPhones.sort((a, b) => a.releaseYear - b.releaseYear),
      brands: matchedBrands,
      technologies: matchedTech,
      total: matchedPhones.length + matchedBrands.length + matchedTech.length,
    }
  },
}
