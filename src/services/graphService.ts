import { phoneService } from './phoneService'
import { brandService } from './brandService'
import { technologies, getTechnologiesData } from '@/data/technologies'
import { stories } from '@/data/stories'
import { formFactors } from '@/data/formFactors'
import { relationshipService, type RelationBasis } from './relationshipService'
import { museumService, type ExhibitRelation } from './museumService'

// ============================================================
// Graph Service（V0.6 规范 §3–§10 / §8 / §67）：
// 关系层，不是新的数据层 —— 节点与边全部从 Phone / Brand /
// Technology / Era / Story / Event / FormFactor 权威数据组装，
// 不复制任何资料。默认只返回当前实体附近的关系（Focus，5–15 节点），
// Depth 2 需用户主动扩展（§10）。
// ============================================================

export type GraphNodeType =
  | 'phone'
  | 'brand'
  | 'technology'
  | 'era'
  | 'event'
  | 'form-factor'
  | 'story'

export interface MuseumGraphNode {
  id: string // 形如 phone:nokia-3310
  type: GraphNodeType
  label: string
  subtitle?: string
  year?: number
  image?: string
  /** 点击后的跳转（若有独立页面）。 */
  href?: string
}

export type GraphRelation =
  | 'made-by'
  | 'belongs-to-era'
  | 'introduced'
  | 'successor'
  | 'predecessor'
  | 'uses'
  | 'influenced'
  | 'same-form'
  | 'same-story'
  | 'related'

export interface MuseumGraphEdge {
  id: string
  source: string
  target: string
  relation: GraphRelation
  basis: RelationBasis
}

export interface GraphFocus {
  center: MuseumGraphNode
  nodes: MuseumGraphNode[]
  edges: MuseumGraphEdge[]
  /** 每个外围节点与中心的关系说明（可解释性，§27 / §41）。 */
  reasons: Record<string, string>
  /** 是否还有更深层关系可展开。 */
  canExpand: boolean
}

const nid = (type: GraphNodeType, id: string) => `${type}:${id}`

// ---- 节点/边组装（惰性 + 缓存，全部由权威数据派生）----

let phoneNodes: MuseumGraphNode[] | null = null
let phoneEdges: MuseumGraphEdge[] | null = null

function resolveHref(type: GraphNodeType, id: string): string | undefined {
  switch (type) {
    case 'phone':
      return `/phone/${id}`
    case 'brand':
      return `/brand/${id}`
    case 'story':
      return `/explore/stories/${id}`
    case 'form-factor':
      return `/form-factor`
    case 'technology':
      return `/technology`
    case 'era':
      return `/phones?era=${id}`
    default:
      return undefined
  }
}

async function buildPhoneNodes(): Promise<MuseumGraphNode[]> {
  if (phoneNodes) return phoneNodes
  const all = await phoneService.getPhones()
  phoneNodes = all.map((p) => ({
    id: nid('phone', p.id),
    type: 'phone' as const,
    label: p.name,
    subtitle: p.brandName,
    year: p.releaseYear,
    href: resolveHref('phone', p.id),
  }))
  return phoneNodes
}

function phoneNodeOf(p: {
  id: string
  name: string
  brandName: string
  releaseYear: number
}): MuseumGraphNode {
  return {
    id: nid('phone', p.id),
    type: 'phone',
    label: p.name,
    subtitle: p.brandName,
    year: p.releaseYear,
    href: resolveHref('phone', p.id),
  }
}

async function buildStaticNodes(): Promise<MuseumGraphNode[]> {
  const [brands, all] = await Promise.all([brandService.getBrands(), phoneService.getPhones()])
  const nodes: MuseumGraphNode[] = []
  for (const b of brands) {
    nodes.push({
      id: nid('brand', b.id),
      type: 'brand',
      label: b.name,
      subtitle: b.nameEn,
      href: resolveHref('brand', b.id),
    })
  }
  for (const t of technologies) {
    nodes.push({ id: nid('technology', t.id), type: 'technology', label: t.name, subtitle: t.category })
  }
  const eraIds = [...new Set(all.map((p) => p.eraId ?? ''))].filter(Boolean)
  for (const era of eraIds) {
    nodes.push({ id: nid('era', era), type: 'era', label: `${era} 年代`, subtitle: era })
  }
  for (const f of formFactors) {
    nodes.push({ id: nid('form-factor', f.id), type: 'form-factor', label: f.label, subtitle: f.en })
  }
  for (const s of stories) {
    nodes.push({ id: nid('story', s.id), type: 'story', label: s.titleZh, subtitle: s.title, href: resolveHref('story', s.id) })
  }
  return nodes
}

async function buildPhoneEdges(): Promise<MuseumGraphEdge[]> {
  if (phoneEdges) return phoneEdges
  const all = await phoneService.getPhones()
  const byId = new Map(all.map((p) => [p.id, p]))
  const edges: MuseumGraphEdge[] = []
  const push = (source: string, target: string, relation: GraphRelation, basis: RelationBasis = 'computed') => {
    edges.push({ id: `${source}->${target}:${relation}`, source, target, relation, basis })
  }

  for (const p of all) {
    const pn = nid('phone', p.id)
    // made-by（品牌）
    push(pn, nid('brand', p.brandId), 'made-by')
    // belongs-to-era（年代）
    if (p.eraId) push(pn, nid('era', p.eraId), 'belongs-to-era')
    // same-form（形态）
    if (p.formFactor) push(pn, nid('form-factor', p.formFactor), 'same-form')
    // uses（技术）
    for (const t of p.technologies ?? []) {
      const tech = getTechnologiesData().find((td) => t.includes(td.name) || t.includes(td.id))
      if (tech) push(pn, nid('technology', tech.id), 'uses')
    }
    // successor / predecessor（数据中是双向声明，这里只出一次）
    for (const succ of p.successorIds ?? []) {
      if (byId.has(succ)) push(pn, nid('phone', succ), 'successor', 'curated')
    }
    // same-story（专题收录）
    for (const s of stories) {
      if ((s.featuredPhoneIds ?? []).includes(p.id)) push(pn, nid('story', s.id), 'same-story')
    }
  }
  phoneEdges = edges
  return edges
}

/** phone:<id> 等复合 id 的中心节点标签。 */
async function nodeById(id: string): Promise<MuseumGraphNode | undefined> {
  const [type, ...rest] = id.split(':')
  const raw = rest.join(':')
  const all = await Promise.all([buildPhoneNodes(), buildStaticNodes()])
  const found = all.flat().find((n) => n.id === id)
  if (found) return found
  switch (type) {
    case 'phone': {
      const p = await phoneService.getPhoneById(raw)
      return p ? phoneNodeOf(p) : undefined
    }
    case 'brand': {
      const b = await brandService.getBrandById(raw)
      return b ? { id, type: 'brand', label: b.name, subtitle: b.nameEn, href: resolveHref('brand', raw) } : undefined
    }
    default:
      return undefined
  }
}

const RELATION_LABELS: Record<ExhibitRelation | GraphRelation | 'same-technology', string> = {
  successor: '继任机型',
  predecessor: '前身机型',
  'same-brand': '同品牌',
  'same-era': '同年代',
  'same-form': '同形态',
  'same-story': '同一专题',
  'same-technology': '同技术',
  related: '历史关联（策展指定）',
  nearby: '附近展品',
  'made-by': '制造商',
  'belongs-to-era': '所属年代',
  introduced: '引入技术',
  uses: '使用技术',
  influenced: '影响了',
}

export const graphService = {
  async getNodes(): Promise<MuseumGraphNode[]> {
    const [phone, stat] = await Promise.all([buildPhoneNodes(), buildStaticNodes()])
    return [...phone, ...stat]
  },

  async getEdges(): Promise<MuseumGraphEdge[]> {
    return buildPhoneEdges()
  },

  /** 中心实体的 Focus 图（Depth 1，规范 §9：默认 5–10 个相关节点）。 */
  async getFocus(entityId: string, depth: 1 | 2 = 1): Promise<GraphFocus | null> {
    const center = await nodeById(entityId.includes(':') ? entityId : nid('phone', entityId))
    if (!center) return null

    const nodes = new Map<string, MuseumGraphNode>()
    const edges = new Map<string, MuseumGraphEdge>()
    const reasons: Record<string, string> = {}
    nodes.set(center.id, center)

    let canExpand = false

    if (center.type === 'phone') {
      const phoneId = center.id.slice('phone:'.length)
      // §52：默认 5–15 节点。按关系配额裁剪，优先级高的先入选。
      const allRelations = await relationshipService.getAllRelations(phoneId)
      const quota: Record<string, number> = {
        successor: 2,
        predecessor: 2,
        'same-brand': 2,
        'same-era': 1,
        'same-technology': 1,
        related: 1,
        'same-story': 1,
        'same-form': 1,
      }
      const used: Record<string, number> = {}
      const relations = allRelations.filter((r) => {
        used[r.relation] = (used[r.relation] ?? 0) + 1
        return used[r.relation] <= (quota[r.relation] ?? 1)
      })
      for (const r of relations) {
        const rn = phoneNodeOf(r.phone)
        nodes.set(rn.id, rn)
        const relation: GraphRelation =
          r.relation === 'successor'
            ? 'successor'
            : r.relation === 'predecessor'
              ? 'predecessor'
              : r.relation === 'same-story'
                ? 'same-story'
                : 'related'
        const edge: MuseumGraphEdge = { id: `${center.id}->${rn.id}:${relation}`, source: center.id, target: rn.id, relation, basis: r.basis }
        edges.set(edge.id, edge)
        reasons[rn.id] = `${RELATION_LABELS[r.relation]} · ${r.basis === 'curated' ? '策展' : '数据计算'}`
      }
      // 年代 / 品牌 / 形态 / 技术节点
      const p = await phoneService.getPhoneById(phoneId)
      if (p) {
        const attach = (type: GraphNodeType, id: string, label: string, subtitle?: string, relation: GraphRelation = 'related') => {
          const n: MuseumGraphNode = { id: nid(type, id), type, label, subtitle, href: resolveHref(type, id) }
          nodes.set(n.id, n)
          const edge: MuseumGraphEdge = { id: `${center.id}->${n.id}:${relation}`, source: center.id, target: n.id, relation, basis: 'computed' }
          edges.set(edge.id, edge)
        }
        attach('brand', p.brandId, p.brandName, p.brandEn, 'made-by')
        if (p.eraId) attach('era', p.eraId, `${p.eraId} 年代`, p.eraId, 'belongs-to-era')
        if (p.formFactor) {
          const f = formFactors.find((v) => v.id === p.formFactor)
          if (f) attach('form-factor', f.id, f.label, f.en, 'same-form')
        }
        for (const t of p.technologies ?? []) {
          const tech = getTechnologiesData().find((td) => t.includes(td.name) || t.includes(td.id))
          if (tech) attach('technology', tech.id, tech.name, tech.category, 'uses')
        }
        // 专题
        for (const s of stories) {
          if ((s.featuredPhoneIds ?? []).includes(phoneId)) {
            attach('story', s.id, s.titleZh, s.title, 'same-story')
          }
        }
      }
    } else if (center.type === 'brand') {
      const brandId = center.id.slice('brand:'.length)
      const phones = await phoneService.getPhonesByBrand(brandId)
      for (const p of phones) {
        const rn = phoneNodeOf(p)
        nodes.set(rn.id, rn)
        const edge: MuseumGraphEdge = { id: `${center.id}->${rn.id}:made-by`, source: center.id, target: rn.id, relation: 'made-by', basis: 'computed' }
        edges.set(edge.id, edge)
        reasons[rn.id] = `${p.releaseYear} 年 · 该品牌产品线`
      }
      canExpand = phones.length > 0
    } else if (center.type === 'technology') {
      const techId = center.id.slice('technology:'.length)
      const tech = getTechnologiesData().find((t) => t.id === techId)
      const related = tech ? await phoneService.getPhonesByTechnology(tech.name) : []
      for (const p of related) {
        const rn = phoneNodeOf(p)
        nodes.set(rn.id, rn)
        const edge: MuseumGraphEdge = { id: `${center.id}->${rn.id}:uses`, source: rn.id, target: center.id, relation: 'uses', basis: 'computed' }
        edges.set(edge.id, edge)
        reasons[rn.id] = `${p.releaseYear} 年 · 使用该技术`
      }
      canExpand = related.length > 0
    } else if (center.type === 'era') {
      const eraId = center.id.slice('era:'.length)
      const phones = (await phoneService.getPhonesByEra(eraId)).slice(0, 8)
      for (const p of phones) {
        const rn = phoneNodeOf(p)
        nodes.set(rn.id, rn)
        const edge: MuseumGraphEdge = { id: `${rn.id}->${center.id}:belongs-to-era`, source: rn.id, target: center.id, relation: 'belongs-to-era', basis: 'computed' }
        edges.set(edge.id, edge)
        reasons[rn.id] = `${p.releaseYear} 年`
      }
      canExpand = phones.length > 0
    } else if (center.type === 'story') {
      const storyId = center.id.slice('story:'.length)
      const story = stories.find((s) => s.id === storyId)
      const phones = await phoneService.resolveMany(story?.featuredPhoneIds ?? [])
      for (const p of phones) {
        const rn = phoneNodeOf(p)
        nodes.set(rn.id, rn)
        const edge: MuseumGraphEdge = { id: `${rn.id}->${center.id}:same-story`, source: rn.id, target: center.id, relation: 'same-story', basis: 'computed' }
        edges.set(edge.id, edge)
        reasons[rn.id] = `${p.releaseYear} 年 · 专题重点展品`
      }
      canExpand = phones.length > 0
    } else if (center.type === 'form-factor') {
      const fid = center.id.slice('form-factor:'.length)
      const phones = (await phoneService.getPhonesByFormFactor(fid)).slice(0, 8)
      for (const p of phones) {
        const rn = phoneNodeOf(p)
        nodes.set(rn.id, rn)
        const edge: MuseumGraphEdge = { id: `${rn.id}->${center.id}:same-form`, source: rn.id, target: center.id, relation: 'same-form', basis: 'computed' }
        edges.set(edge.id, edge)
        reasons[rn.id] = `${p.releaseYear} 年 · ${p.brandName}`
      }
      canExpand = phones.length > 0
    }

    // Depth 2（§10）：外围 phone 节点的直接继任/前身（仅标记可扩展，默认不展开）
    if (depth === 2) {
      const phoneNeighbors = [...nodes.values()].filter((n) => n.type === 'phone' && n.id !== center.id)
      for (const neighbor of phoneNeighbors.slice(0, 6)) {
        const nid0 = neighbor.id.slice('phone:'.length)
        const rels = await relationshipService.getAllRelations(nid0)
        for (const r of rels.slice(0, 3)) {
          const rn = phoneNodeOf(r.phone)
          if (nodes.has(rn.id)) continue
          nodes.set(rn.id, rn)
          const edge: MuseumGraphEdge = {
            id: `${neighbor.id}->${rn.id}:${r.relation === 'successor' ? 'successor' : 'related'}`,
            source: neighbor.id,
            target: rn.id,
            relation: r.relation === 'successor' ? 'successor' : 'related',
            basis: r.basis,
          }
          edges.set(edge.id, edge)
          reasons[rn.id] = `经由 ${neighbor.label} · ${RELATION_LABELS[r.relation]}`
        }
      }
    }

    return {
      center,
      nodes: [...nodes.values()],
      edges: [...edges.values()],
      reasons,
      canExpand,
    }
  },

  /** 某实体的可解释关联展品（§26–§27 / §72）。 */
  async getRelatedExhibits(phoneId: string, limit = 5) {
    return museumService.getNearbyExhibits(phoneId, limit)
  },
}

export { RELATION_LABELS as GRAPH_RELATION_LABELS }
