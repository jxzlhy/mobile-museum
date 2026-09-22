import {
  type CuratedExhibition,
  type ExhibitionBlock,
  type BlockType,
  MAX_EXHIBITIONS,
  MAX_TITLE_LENGTH,
  MAX_INTRO_LENGTH,
  sanitizeText,
  newBlockId,
  renumber,
} from './types'
import { blockRegistry, sanitizeBlockData } from './blockRegistry'
import { phoneService } from '../phoneService'
import { exhibitionService } from '../exhibitionService'

// ============================================================
// Curator Service（V0.8 规范 §28 / §30–§38 / §45）：
// 本地策展工作台。存储 museum.curator.*；
// 迁移兼容 museum.exhibitions（V0.5/V0.6 个人展览）。
// Share 继续 V0.5 架构（CompressionStream + URL-safe Base64）。
// ============================================================

const EXHIBITIONS_KEY = 'museum.curator.exhibitions'
const DRAFTS_KEY = 'museum.curator.drafts'
const PREFS_KEY = 'museum.curator.preferences'
const LEGACY_KEY = 'museum.exhibitions'

// ---- 存储 ----

function readList(key: string): CuratedExhibition[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is CuratedExhibition =>
      typeof v === 'object' && v !== null && typeof (v as CuratedExhibition).id === 'string' && Array.isArray((v as CuratedExhibition).blocks),
    ).map(sanitizeExhibition)
  } catch {
    return []
  }
}

function writeList(key: string, items: CuratedExhibition[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_EXHIBITIONS)))
  } catch {
    /* ignore */
  }
}

/** 迁移（§38）：V0.5 PersonalExhibition {title,intro,phoneIds} → CuratedExhibition。 */
function migrateLegacy(): CuratedExhibition[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const migrated: CuratedExhibition[] = []
    for (const v of parsed) {
      const old = v as { id?: string; title?: string; intro?: string; phoneIds?: string[]; createdAt?: number; updatedAt?: number }
      if (!old || typeof old.id !== 'string') continue
      const now = Date.now()
      const blocks: ExhibitionBlock[] = (old.phoneIds ?? []).map((phoneId, i) => ({
        id: newBlockId(),
        type: 'exhibit' as BlockType,
        data: { phoneId, displayMode: 'photo' },
        order: i,
      }))
      migrated.push({
        id: old.id,
        title: old.title ?? '未命名展览',
        intro: old.intro,
        blocks,
        createdAt: old.createdAt ?? now,
        updatedAt: old.updatedAt ?? now,
        version: 2,
        published: true,
        theme: 'migrated',
      })
    }
    return migrated
  } catch {
    return []
  }
}

let migrated = false

function ensureMigrated() {
  if (migrated) return
  migrated = true
  const existing = readList(EXHIBITIONS_KEY)
  if (existing.length > 0) return
  const legacy = migrateLegacy()
  if (legacy.length > 0) {
    writeList(EXHIBITIONS_KEY, legacy)
    // 不删除旧键（§38 不丢数据）
  }
}

// ---- 清洗 ----

export function sanitizeBlock(raw: unknown): ExhibitionBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const type = b.type as BlockType
  if (!blockRegistry.get(type)) return null
  return {
    id: typeof b.id === 'string' && b.id ? sanitizeText(b.id, 80) : newBlockId(),
    type,
    data: sanitizeBlockData(type, b.data),
    order: typeof b.order === 'number' ? b.order : 0,
  }
}

export function sanitizeExhibition(raw: unknown): CuratedExhibition {
  const e = raw as Record<string, unknown>
  const blocks = (Array.isArray(e.blocks) ? e.blocks : [])
    .map(sanitizeBlock)
    .filter((b): b is ExhibitionBlock => b !== null)
  return {
    id: typeof e.id === 'string' ? sanitizeText(e.id, 80) : newBlockId(),
    title: sanitizeText(e.title, MAX_TITLE_LENGTH) || '未命名展览',
    subtitle: e.subtitle ? sanitizeText(e.subtitle, MAX_TITLE_LENGTH) : undefined,
    intro: e.intro ? sanitizeText(e.intro, MAX_INTRO_LENGTH) : undefined,
    theme: e.theme ? sanitizeText(e.theme, 40) : undefined,
    coverPhoneId: e.coverPhoneId ? sanitizeText(e.coverPhoneId, 80) : undefined,
    blocks: renumber(blocks),
    createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
    updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : Date.now(),
    version: 2,
    published: e.published === true,
  }
}

// ---- 服务 ----

export const curatorService = {
  getAll(): CuratedExhibition[] {
    ensureMigrated()
    return readList(EXHIBITIONS_KEY).sort((a, b) => b.updatedAt - a.updatedAt)
  },

  getById(id: string): CuratedExhibition | undefined {
    return this.getAll().find((e) => e.id === id)
  },

  getDraft(id: string): CuratedExhibition | undefined {
    try {
      const raw = localStorage.getItem(DRAFTS_KEY)
      if (!raw) return undefined
      const map = JSON.parse(raw) as Record<string, unknown>
      return map[id] ? sanitizeExhibition(map[id]) : undefined
    } catch {
      return undefined
    }
  },

  create(title: string, theme?: string): CuratedExhibition | null {
    ensureMigrated()
    const items = this.getAll()
    if (items.length >= MAX_EXHIBITIONS) return null
    const now = Date.now()
    const ex: CuratedExhibition = {
      id: `exh-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: sanitizeText(title, MAX_TITLE_LENGTH) || '未命名展览',
      theme,
      blocks: [],
      createdAt: now,
      updatedAt: now,
      version: 2,
      published: false,
    }
    items.unshift(ex)
    writeList(EXHIBITIONS_KEY, items)
    return ex
  },

  update(id: string, patch: Partial<Pick<CuratedExhibition, 'title' | 'subtitle' | 'intro' | 'theme' | 'coverPhoneId' | 'blocks' | 'published'>>): CuratedExhibition | undefined {
    const items = this.getAll()
    const ex = items.find((e) => e.id === id)
    if (!ex) return undefined
    if (patch.title !== undefined) ex.title = sanitizeText(patch.title, MAX_TITLE_LENGTH) || ex.title
    if (patch.subtitle !== undefined) ex.subtitle = patch.subtitle ? sanitizeText(patch.subtitle, MAX_TITLE_LENGTH) : undefined
    if (patch.intro !== undefined) ex.intro = patch.intro ? sanitizeText(patch.intro, MAX_INTRO_LENGTH) : undefined
    if (patch.theme !== undefined) ex.theme = patch.theme ? sanitizeText(patch.theme, 40) : undefined
    if (patch.coverPhoneId !== undefined) ex.coverPhoneId = patch.coverPhoneId || undefined
    if (patch.blocks !== undefined) {
      const limitErr = blockRegistry.validateLimits(patch.blocks)
      if (limitErr) return undefined
      ex.blocks = renumber(patch.blocks.map((b) => sanitizeBlock(b) ?? b).filter(Boolean) as ExhibitionBlock[])
    }
    if (patch.published !== undefined) ex.published = patch.published
    ex.updatedAt = Date.now()
    writeList(EXHIBITIONS_KEY, items)
    return ex
  },

  remove(id: string) {
    writeList(EXHIBITIONS_KEY, this.getAll().filter((e) => e.id !== id))
    try {
      const raw = localStorage.getItem(DRAFTS_KEY)
      if (raw) {
        const map = JSON.parse(raw) as Record<string, unknown>
        delete map[id]
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(map))
      }
    } catch {
      /* ignore */
    }
  },

  /** 复制（§30）：新 id、新 block id、新时间戳，不共享可变引用。 */
  duplicate(id: string): CuratedExhibition | null {
    const src = this.getById(id)
    if (!src) return null
    const items = this.getAll()
    if (items.length >= MAX_EXHIBITIONS) return null
    const now = Date.now()
    const copy: CuratedExhibition = {
      ...structuredClone(src),
      id: `exh-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${src.title}（副本）`.slice(0, MAX_TITLE_LENGTH),
      blocks: src.blocks.map((b) => ({ ...structuredClone(b), id: newBlockId() })),
      createdAt: now,
      updatedAt: now,
      published: false,
    }
    items.unshift(copy)
    writeList(EXHIBITIONS_KEY, items)
    return copy
  },

  /** 草稿（§26/§45）：编辑中的工作副本。 */
  saveDraft(ex: CuratedExhibition) {
    try {
      const raw = localStorage.getItem(DRAFTS_KEY)
      const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      map[ex.id] = ex
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(map))
    } catch {
      /* ignore */
    }
  },

  clearDraft(id: string) {
    try {
      const raw = localStorage.getItem(DRAFTS_KEY)
      if (!raw) return
      const map = JSON.parse(raw) as Record<string, unknown>
      delete map[id]
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(map))
    } catch {
      /* ignore */
    }
  },

  /** 本地发布（§45）：只是状态标记，不上传。 */
  publishLocal(id: string): CuratedExhibition | undefined {
    const ex = this.update(id, { published: true })
    this.clearDraft(id)
    return ex
  },

  // ---- Share（§32–§35）：v2 payload，只含引用 ----

  async buildShareUrl(ex: CuratedExhibition): Promise<{ ok: true; url: string } | { ok: false; reason: 'too-large' }> {
    const payload = {
      v: 2,
      t: ex.title,
      s: ex.subtitle,
      i: ex.intro,
      c: ex.coverPhoneId,
      b: ex.blocks.map((b) => ({ t: b.type, d: b.data })),
    }
    const json = JSON.stringify(payload)
    const raw = new TextEncoder().encode(json)
    let encoded: string
    try {
      const CS = (globalThis as { CompressionStream?: typeof CompressionStream }).CompressionStream
      if (!CS) throw new Error('no CompressionStream')
      const stream = new Blob([raw as unknown as BlobPart]).stream().pipeThrough(new CS('deflate-raw'))
      const buf = await new Response(stream).arrayBuffer()
      encoded = 'z2.' + toBase64Url(new Uint8Array(buf))
    } catch {
      encoded = 'r2.' + toBase64Url(raw)
    }
    const base = `${location.origin}${import.meta.env.BASE_URL}${
      import.meta.env.MODE === 'github' ? '#/exhibition/share/' : 'exhibition/share/'
    }`
    const url = base + encoded
    if (url.length > 8000) return { ok: false, reason: 'too-large' }
    return { ok: true, url }
  },

  /** 解析分享（§34 schema 校验 + §35 坏引用降级）。 */
  async parseShareUrl(payload: string): Promise<CuratedExhibition | null> {
    try {
      let json: string
      if (payload.startsWith('z2.')) {
        json = new TextDecoder().decode(await inflateRaw(fromBase64Url(payload.slice(3))))
      } else if (payload.startsWith('r2.')) {
        json = new TextDecoder().decode(fromBase64Url(payload.slice(3)))
      } else {
        // 回退 V0.5 v1 payload
        const v1 = await exhibitionService.parseShareUrl(payload)
        if (!v1) return null
        const blocks: ExhibitionBlock[] = v1.phones.map((p, i) => ({ id: newBlockId(), type: 'exhibit', data: { phoneId: p.id, displayMode: 'photo' }, order: i }))
        return { id: 'shared-v1', title: v1.title, intro: v1.intro, blocks, createdAt: 0, updatedAt: 0, version: 2, published: true }
      }
      const parsed = JSON.parse(json) as Record<string, unknown>
      if (!parsed || typeof parsed.t !== 'string' || !Array.isArray(parsed.b)) return null
      const ex = sanitizeExhibition({
        id: 'shared',
        title: parsed.t,
        subtitle: parsed.s,
        intro: parsed.i,
        coverPhoneId: parsed.c,
        blocks: (parsed.b as Array<Record<string, unknown>>).map((b) => ({ id: newBlockId(), type: b.t, data: b.d, order: 0 })),
        version: 2,
        published: true,
      })
      // §35：坏引用不删除 Block，渲染时降级为 EXHIBIT UNAVAILABLE
      return ex
    } catch {
      return null
    }
  },

  // ---- Import / Export（§36–§37）----

  exportExhibition(ex: CuratedExhibition): string {
    return JSON.stringify(
      {
        format: 'mobile-museum-exhibition',
        version: 1,
        title: ex.title,
        subtitle: ex.subtitle,
        intro: ex.intro,
        theme: ex.theme,
        coverPhoneId: ex.coverPhoneId,
        blocks: ex.blocks.map((b) => ({ type: b.type, data: b.data })),
      },
      null,
      2,
    )
  },

  /** 导入（§37）：校验 format/version/schema/block types/phone ids/长度。 */
  async importExhibition(json: string): Promise<{ ok: true; exhibition: CuratedExhibition; warnings: string[] } | { ok: false; error: string }> {
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>
      if (parsed.format !== 'mobile-museum-exhibition' || parsed.version !== 1) {
        return { ok: false, error: 'INVALID EXHIBITION FILE' }
      }
      if (!Array.isArray(parsed.blocks)) return { ok: false, error: 'INVALID EXHIBITION FILE' }
      const ex = sanitizeExhibition({
        id: `exh-${Date.now().toString(36)}-import`,
        title: parsed.title,
        subtitle: parsed.subtitle,
        intro: parsed.intro,
        theme: parsed.theme,
        coverPhoneId: parsed.coverPhoneId,
        blocks: (parsed.blocks as Array<Record<string, unknown>>).map((b) => ({ id: newBlockId(), type: b.type, data: b.data, order: 0 })),
        version: 2,
        published: false,
      })
      const limitErr = blockRegistry.validateLimits(ex.blocks)
      if (limitErr) return { ok: false, error: limitErr }
      const warnings: string[] = []
      const all = await phoneService.getPhones()
      const ids = new Set(all.map((p) => p.id))
      for (const b of ex.blocks) {
        const d = b.data as Record<string, unknown>
        const refs = [d.phoneId, d.leftPhoneId, d.rightPhoneId, d.coverPhoneId].filter((v): v is string => typeof v === 'string' && v.length > 0)
        for (const r of refs) {
          if (!ids.has(r)) warnings.push(`UNAVAILABLE EXHIBIT: ${r}`)
        }
      }
      const items = this.getAll()
      if (items.length >= MAX_EXHIBITIONS) return { ok: false, error: `最多 ${MAX_EXHIBITIONS} 个展览` }
      items.unshift(ex)
      writeList(EXHIBITIONS_KEY, items)
      return { ok: true, exhibition: ex, warnings }
    } catch {
      return { ok: false, error: 'INVALID EXHIBITION FILE' }
    }
  },

  // ---- 偏好（§28）----

  getPref(key: string): string | null {
    try {
      const raw = localStorage.getItem(PREFS_KEY)
      if (!raw) return null
      return ((JSON.parse(raw) as Record<string, string>)[key]) ?? null
    } catch {
      return null
    }
  },

  setPref(key: string, value: string) {
    try {
      const raw = localStorage.getItem(PREFS_KEY)
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      map[key] = value
      localStorage.setItem(PREFS_KEY, JSON.stringify(map))
    } catch {
      /* ignore */
    }
  },
}

// ---- base64url / deflate helpers ----

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream
  if (!DS) throw new Error('no DecompressionStream')
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new DS('deflate-raw'))
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}
