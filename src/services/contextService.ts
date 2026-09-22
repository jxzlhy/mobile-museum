import { phoneService } from './phoneService'
import { brandService } from './brandService'
import { getTechnologiesData } from '@/data/technologies'
import { contextNotes, type HistoricalContext } from '@/data/contexts'
import { eventService } from './eventService'
import { getJourneys } from '@/data/journeys'

// ============================================================
// Context Service（V0.6 规范 §19–§21 / §44 / §69）：
// 实体关系按年份从权威数据计算；策展短注来自 data/contexts。
// 没有资料的维度就缺省 —— 不虚构（规范 §19 / §76）。
// ============================================================

export interface ContextView {
  year: number
  phones: Array<{ id: string; name: string; brandName: string; releaseYear: number }>
  brands: string[]
  technologies: Array<{ id: string; name: string }>
  networks: string[]
  culturalNotes: string[]
  designTrends: string[]
  events: Array<{ id: string; year: number; title: string }>
  /** 与该年相关的策展路线（context → journey 联动）。 */
  journeys: Array<{ id: string; titleZh: string; title: string }>
  limited: boolean
}

export const contextService = {
  /** 可用的 Context 年份（§69）。 */
  getAvailableYears(): number[] {
    return Object.keys(contextNotes).map(Number).sort((a, b) => a - b)
  },

  async getContext(year: number): Promise<ContextView | null> {
    const notes = contextNotes[year]
    const [all, brands, events] = await Promise.all([
      phoneService.getPhones(),
      brandService.getBrands(),
      eventService.getEvents(),
    ])

    const yearPhones = all.filter((p) => p.releaseYear === year)
    const notesAny = notes as HistoricalContext | undefined
    const phonesForContext = yearPhones.length > 0
      ? yearPhones
      : notesAny
        ? all.filter((p) => Math.abs(p.releaseYear - year) <= 1).slice(0, 6)
        : []

    const activeBrandIds = new Set(phonesForContext.map((p) => p.brandId))
    const activeBrands = brands.filter((b) => activeBrandIds.has(b.id))

    const techs = getTechnologiesData()
      .filter((t) => (t.startYear ?? 9999) <= year)
      .slice(0, 8)

    const yearEvents = events
      .filter((e) => Math.abs(e.year - year) <= 1)
      .slice(0, 5)

    // 相关路线：路线里的 stop 有该年±1 的展品
    const journeys = getJourneys().filter((j) =>
      j.stops.some((s) => {
        const p = all.find((v) => v.id === s.phoneId)
        return p ? Math.abs(p.releaseYear - year) <= 2 : false
      }),
    )

    const limited = phonesForContext.length === 0 && !notesAny

    return {
      year,
      phones: phonesForContext.map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brandName,
        releaseYear: p.releaseYear,
      })),
      brands: activeBrands.map((b) => b.name),
      technologies: techs.map((t) => ({ id: t.id, name: t.name })),
      networks: notesAny?.networks ?? [],
      culturalNotes: notesAny?.culturalNotes ?? [],
      designTrends: notesAny?.designTrends ?? [],
      events: yearEvents.map((e) => ({ id: e.id, year: e.year, title: e.title })),
      journeys: journeys.map((j) => ({ id: j.id, titleZh: j.titleZh, title: j.title })),
      limited,
    }
  },
}
