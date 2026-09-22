import { phoneService } from './phoneService'
import { formFactors } from '@/data/formFactors'
import { technologies } from '@/data/technologies'
import { relationshipService, type RelationBasis } from './relationshipService'
import type { FormFactor, Phone } from '@/data/types'

// ============================================================
// Museum Service（规范 §70–§71）：展厅内容的唯一策展来源。
// 房间与展品一律从 Phone / Brand / Story / Technology / Era
// 动态生成，不在页面里硬编码展品清单。
// ============================================================

export type RoomKind = 'main' | 'zone' | 'treasures' | 'era'

export interface MuseumRoom {
  id: string
  kind: RoomKind
  /** 展厅英文题（如 HISTORY OF THE PHONE）。 */
  title: string
  /** 展厅中文题。 */
  titleZh: string
  /** 年份跨度等副题（如 1973 — 2026）。 */
  subtitle?: string
  /** 一段策展导言。 */
  description?: string
  /** 展品 id（按展厅动线顺序）。 */
  exhibitIds: string[]
  startYear?: number
  endYear?: number
}

export type ExhibitRelation =
  | 'successor'
  | 'predecessor'
  | 'same-brand'
  | 'same-era'
  | 'same-form'
  | 'same-story'
  | 'nearby'

export interface NearbyExhibit {
  phone: Phone
  relation: ExhibitRelation
}

/** 相关关系的展示标签（规范 §27 / §29）。 */
export const RELATION_LABELS: Record<ExhibitRelation, { zh: string; en: string }> = {
  successor: { zh: '继任者', en: 'SUCCESSOR' },
  predecessor: { zh: '前身', en: 'PREDECESSOR' },
  'same-brand': { zh: '同品牌', en: 'SAME BRAND' },
  'same-era': { zh: '同时代', en: 'SAME ERA' },
  'same-form': { zh: '同形态', en: 'SAME FORM' },
  'same-story': { zh: '同一篇章', en: 'SAME STORY' },
  nearby: { zh: '附近展品', en: 'NEARBY' },
}

/** 推荐排序权重（规范 §29）：不要随机。 */
const RELATION_PRIORITY: ExhibitRelation[] = [
  'successor',
  'predecessor',
  'same-brand',
  'same-era',
  'same-form',
  'same-story',
  'nearby',
]

const byYear = (a: Phone, b: Phone) => a.releaseYear - b.releaseYear

/** 可解释推荐（规范 §26–§27 / §72）：每条推荐都必须带明确理由。 */
export interface ExhibitRecommendation {
  phone: Phone
  reason: string
  relation: string
  basis: RelationBasis
}

const RECOMMEND_ORDER: Array<ExhibitRecommendation['relation']> = [
  '继任者',
  '前身',
  '同品牌',
  '同一篇章',
  '同时代',
  '共同技术',
  '同形态',
  '历史关联（策展指定）',
]

/** 策展排序：年代早的优先；同级里展品等级高的优先。 */
const curate = (a: Phone, b: Phone) => byYear(a, b) || b.exhibitLevel - a.exhibitLevel

function rangeOf(phones: Phone[]): { startYear?: number; endYear?: number } {
  if (phones.length === 0) return {}
  const years = phones.map((p) => p.releaseYear)
  return { startYear: Math.min(...years), endYear: Math.max(...years) }
}

const ERA_NOTES: Record<string, string> = {
  '1970s': '一切从这里开始：一根天线，一通电话。',
  '1980s': '手机成为商品，也成为图腾。',
  '1990s': '手机走进每个人的口袋，成为日用品。',
  '2000s': '屏幕亮起来，音乐、相机与网络装进机身。',
  '2010s': '触摸屏重造了手机，也重造了生活。',
  '2020s': '屏幕开始折叠，形态再次自由。',
}

async function buildRooms(): Promise<MuseumRoom[]> {
  const all = await phoneService.getPhones()

  // ---- HISTORY：重大里程碑（Level 2+），按年代动线 ----
  const history = all.filter((p) => p.exhibitLevel >= 2).sort(curate).slice(0, 8)

  // ---- DESIGN：每个年代选一件设计代表（原创程序化 3D 优先）----
  const eras = [...new Set(all.map((p) => p.eraId ?? ''))].filter(Boolean).sort()
  const design = eras
    .map((era) =>
      all
        .filter((p) => p.eraId === era)
        .sort((a, b) => Number(Boolean(b.model)) - Number(Boolean(a.model)) || b.exhibitLevel - a.exhibitLevel || byYear(a, b))[0],
    )
    .filter((p): p is Phone => Boolean(p))

  // ---- TECHNOLOGY：每个技术类别选代表机型（每类至多 2 件，保证覆盖面）----
  const techExemplars: Phone[] = []
  for (const tech of technologies) {
    const matches = all
      .filter((p) => (p.technologies ?? []).some((t) => t.includes(tech.name) || t.includes(tech.id)))
      .sort((a, b) => b.exhibitLevel - a.exhibitLevel || byYear(a, b))
      .slice(0, 2)
    for (const match of matches) {
      if (!techExemplars.some((p) => p.id === match.id)) techExemplars.push(match)
    }
  }
  const technology = techExemplars.sort(curate).slice(0, 8)

  // ---- FORM FACTOR：每种形态选一件代表 ----
  const factorIds: FormFactor[] = formFactors.map((f) => f.id)
  const formFactor = factorIds
    .map((id) =>
      all.filter((p) => p.formFactor === id).sort((a, b) => b.exhibitLevel - a.exhibitLevel || byYear(a, b))[0],
    )
    .filter((p): p is Phone => Boolean(p))
    .sort((a, b) => {
      const ia = factorIds.indexOf(a.formFactor as FormFactor)
      const ib = factorIds.indexOf(b.formFactor as FormFactor)
      return ia - ib
    })

  // ---- TREASURES：珍藏展厅（Level 3，规范 §21：10–20 台）----
  const treasures = all.filter((p) => p.exhibitLevel === 3).sort(curate).slice(0, 20)

  const rooms: MuseumRoom[] = [
    {
      id: 'history',
      kind: 'zone',
      title: 'HISTORY OF THE PHONE',
      titleZh: '历史',
      description: '从 1973 年街头的第一通电话开始，五十年里改变一切的节点。',
      exhibitIds: history.map((p) => p.id),
      ...rangeOf(history),
    },
    {
      id: 'design',
      kind: 'zone',
      title: 'DESIGN & MATERIAL',
      titleZh: '设计',
      description: '每个年代有一件东西，定义了那个年代的手应该是什么样子。',
      exhibitIds: design.map((p) => p.id),
      ...rangeOf(design),
    },
    {
      id: 'technology',
      kind: 'zone',
      title: 'TECHNOLOGY',
      titleZh: '技术',
      description: '屏幕、相机、网络、电池——每一次技术换代都换了 一种拿手机的姿势。',
      exhibitIds: technology.map((p) => p.id),
      ...rangeOf(technology),
    },
    {
      id: 'form-factor',
      kind: 'zone',
      title: 'FORM FACTOR',
      titleZh: '形态',
      description: '砖块、翻盖、滑盖、全键盘、大屏、折叠——形态即态度。',
      exhibitIds: formFactor.map((p) => p.id),
      ...rangeOf(formFactor),
    },
    {
      id: 'treasures',
      kind: 'treasures',
      title: 'THE TREASURE ROOM',
      titleZh: '珍藏',
      description: '馆藏珍品：照片、3D 与故事俱备的那些机器。',
      exhibitIds: treasures.map((p) => p.id),
      ...rangeOf(treasures),
    },
  ]
  return rooms
}

let roomsCache: MuseumRoom[] | null = null

export const museumService = {
  /** 主展厅核心展区（规范 §9：默认 4–5 个）。 */
  async getRooms(): Promise<MuseumRoom[]> {
    if (!roomsCache) roomsCache = await buildRooms()
    return roomsCache
  },

  async getRoom(id: string): Promise<MuseumRoom | undefined> {
    const rooms = await this.getRooms()
    return rooms.find((r) => r.id === id) ?? (await this.getEraRooms()).find((r) => r.id === id)
  },

  async getRoomExhibits(id: string): Promise<Phone[]> {
    const room = await this.getRoom(id)
    if (!room) return []
    return phoneService.resolveMany(room.exhibitIds)
  },

  /** 珍藏展厅（规范 §21–§22）。 */
  async getTreasureExhibits(): Promise<Phone[]> {
    return this.getRoomExhibits('treasures')
  },

  /** 时代展厅（规范 §30–§33）。 */
  async getEraRooms(): Promise<MuseumRoom[]> {
    const all = await phoneService.getPhones()
    const eraIds = [...new Set(all.map((p) => p.eraId ?? ''))].filter(Boolean).sort()
    return eraIds.map((era) => {
      const inEra = all.filter((p) => p.eraId === era)
      const featured = [...inEra].sort((a, b) => b.exhibitLevel - a.exhibitLevel || byYear(a, b)).slice(0, 6)
      return {
        id: era,
        kind: 'era' as const,
        title: `THE ${era.toUpperCase()}`,
        titleZh: `${era} 年代`,
        subtitle: `${era.slice(0, 4)} — ${era.slice(2, 4)}9`,
        description: ERA_NOTES[era],
        exhibitIds: featured.map((p) => p.id),
        ...rangeOf(inEra),
      }
    })
  },

  /**
   * 附近展品（规范 §27–§29）：
   * successor → predecessor → same-brand → same-era → same-form → same-story。
   */
  async getNearbyExhibits(phoneId: string, limit = 3): Promise<NearbyExhibit[]> {
    const all = await phoneService.getPhones()
    const source = all.find((p) => p.id === phoneId)
    if (!source) return []

    const picked = new Map<string, { phone: Phone; relation: ExhibitRelation }>()
    const put = (candidates: Phone[], relation: ExhibitRelation) => {
      for (const p of candidates) {
        if (p.id === source.id) continue
        if (!picked.has(p.id)) picked.set(p.id, { phone: p, relation })
      }
    }

    put(await phoneService.resolveMany(source.successorIds ?? []), 'successor')
    put(await phoneService.resolveMany(source.predecessorIds ?? []), 'predecessor')
    put(all.filter((p) => p.brandId === source.brandId), 'same-brand')
    put(all.filter((p) => p.eraId === source.eraId && p.eraId !== undefined), 'same-era')
    put(all.filter((p) => p.formFactor === source.formFactor && p.formFactor !== undefined), 'same-form')
    put(await phoneService.resolveMany(source.relatedPhoneIds ?? []), 'same-story')

    // 同一桶内按年代就近排序，桶间按 §29 优先级。
    const ranked = RELATION_PRIORITY.flatMap((relation) =>
      [...picked.values()]
        .filter((n) => n.relation === relation)
        .sort((a, b) => Math.abs(a.phone.releaseYear - source.releaseYear) - Math.abs(b.phone.releaseYear - source.releaseYear)),
    )
    return ranked.slice(0, limit)
  },

  /**
   * YOU MAY ALSO EXPLORE（V0.6 规范 §26 / §72）：
   * successor → predecessor → same-brand → same-story → same-era →
   * same-technology → same-form，最多 5 条，每条带可解释理由。
   */
  async getRecommendations(phoneId: string, limit = 5): Promise<ExhibitRecommendation[]> {
    const [all, nearby] = await Promise.all([
      phoneService.getPhones(),
      this.getNearbyExhibits(phoneId, 10),
    ])
    const source = all.find((p) => p.id === phoneId)
    if (!source) return []

    const picked = new Map<string, ExhibitRecommendation>()
    const put = (phone: Phone, relation: string, reason: string, basis: RelationBasis) => {
      if (phone.id === phoneId || picked.has(phone.id)) return
      picked.set(phone.id, { phone, relation, reason, basis })
    }

    for (const n of nearby) {
      const label = RELATION_LABELS[n.relation]
      put(n.phone, label.zh, label.zh, 'computed')
    }
    // 同技术（§72：same-technology）
    const techRels = await relationshipService.getRelatedByTechnology(phoneId)
    for (const r of techRels.slice(0, 4)) {
      put(r.phone, '共同技术', `共同技术 · ${(r.phone.technologies ?? []).find((t) => (source.technologies ?? []).includes(t)) ?? '技术谱系相同'}`, r.basis)
    }

    return [...picked.values()]
      .sort((a, b) => RECOMMEND_ORDER.indexOf(a.relation) - RECOMMEND_ORDER.indexOf(b.relation))
      .slice(0, limit)
  },
}
