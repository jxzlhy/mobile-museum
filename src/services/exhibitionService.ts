import { phoneService } from './phoneService'
import type { Phone } from '@/data/types'

// ============================================================
// Exhibition Service（V0.5 规范 §19–§24 / §54）：
// MY EXHIBITION —— 参观者自己策展。全部 localStorage（museum.exhibitions），
// 分享用 URL encoded state，不上传任何用户数据（§22）。
// 限制（§21）：每个展览 ≤ 20 台，每人 ≤ 10 个展览。
// ============================================================

const STORAGE_KEY = 'museum.exhibitions'
export const MAX_PHONES_PER_EXHIBITION = 20
export const MAX_EXHIBITIONS = 10

export interface PersonalExhibition {
  id: string
  title: string
  intro?: string
  phoneIds: string[]
  createdAt: number
  updatedAt: number
}

// ---- 分享 payload（§22 / §24）：version + title + intro + phoneIds，无账号/Token ----

interface SharePayload {
  v: 1
  t: string
  i?: string
  p: string[]
}

const MAX_URL_LENGTH = 8000

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const CS = (globalThis as { CompressionStream?: typeof CompressionStream }).CompressionStream
  if (!CS) throw new Error('no CompressionStream')
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new CS('deflate-raw'))
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream
  if (!DS) throw new Error('no DecompressionStream')
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new DS('deflate-raw'))
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

function read(): PersonalExhibition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (v): v is PersonalExhibition =>
          typeof v === 'object' && v !== null && typeof (v as PersonalExhibition).id === 'string',
      )
      .map((v) => ({
        id: v.id,
        title: typeof v.title === 'string' ? v.title : '未命名展览',
        intro: typeof v.intro === 'string' ? v.intro : undefined,
        phoneIds: Array.isArray(v.phoneIds) ? v.phoneIds.filter((id) => typeof id === 'string') : [],
        createdAt: typeof v.createdAt === 'number' ? v.createdAt : Date.now(),
        updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : Date.now(),
      }))
      .slice(0, MAX_EXHIBITIONS)
  } catch {
    return []
  }
}

function write(items: PersonalExhibition[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_EXHIBITIONS)))
  } catch {
    /* ignore */
  }
}

function newId(): string {
  return `ex-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const exhibitionService = {
  getAll(): PersonalExhibition[] {
    return read().sort((a, b) => b.updatedAt - a.updatedAt)
  },

  getById(id: string): PersonalExhibition | undefined {
    return read().find((e) => e.id === id)
  },

  create(title: string, intro?: string): PersonalExhibition | null {
    const items = read()
    if (items.length >= MAX_EXHIBITIONS) return null
    const now = Date.now()
    const exhibition: PersonalExhibition = {
      id: newId(),
      title: title.trim() || '未命名展览',
      intro: intro?.trim() || undefined,
      phoneIds: [],
      createdAt: now,
      updatedAt: now,
    }
    items.push(exhibition)
    write(items)
    return exhibition
  },

  update(id: string, patch: Partial<Pick<PersonalExhibition, 'title' | 'intro' | 'phoneIds'>>): PersonalExhibition | undefined {
    const items = read()
    const ex = items.find((e) => e.id === id)
    if (!ex) return undefined
    if (patch.title !== undefined) ex.title = patch.title.trim() || ex.title
    if (patch.intro !== undefined) ex.intro = patch.intro.trim() || undefined
    if (patch.phoneIds !== undefined) {
      const ids = patch.phoneIds.filter((id, i, arr) => arr.indexOf(id) === i)
      ex.phoneIds = ids.slice(0, MAX_PHONES_PER_EXHIBITION)
    }
    ex.updatedAt = Date.now()
    write(items)
    return ex
  },

  remove(id: string) {
    write(read().filter((e) => e.id !== id))
  },

  /** 加入展品（去重，超过 20 台拒绝并返回 false，§21）。 */
  addPhone(id: string, phoneId: string): boolean {
    const ex = this.getById(id)
    if (!ex) return false
    if (ex.phoneIds.includes(phoneId)) return true
    if (ex.phoneIds.length >= MAX_PHONES_PER_EXHIBITION) return false
    return Boolean(this.update(id, { phoneIds: [...ex.phoneIds, phoneId] }))
  },

  removePhone(id: string, phoneId: string) {
    const ex = this.getById(id)
    if (!ex) return
    void this.update(id, { phoneIds: ex.phoneIds.filter((v) => v !== phoneId) })
  },

  /** 上移 / 下移（dir: -1 上移，1 下移）。 */
  movePhone(id: string, phoneId: string, dir: -1 | 1) {
    const ex = this.getById(id)
    if (!ex) return
    const arr = [...ex.phoneIds]
    const i = arr.indexOf(phoneId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    void this.update(id, { phoneIds: arr })
  },

  /**
   * 分享 URL（§22–§24）：轻量压缩（原生 CompressionStream，deflate-raw）
   * + URL-safe Base64。payload 过长返回 too-large
   * （调用方显示 THIS EXHIBITION IS TOO LARGE TO SHARE，不截断数据）。
   */
  async buildShareUrl(
    exhibition: Pick<PersonalExhibition, 'title' | 'intro' | 'phoneIds'>,
  ): Promise<{ ok: true; url: string } | { ok: false; reason: 'too-large' }> {
    const payload: SharePayload = {
      v: 1,
      t: exhibition.title,
      i: exhibition.intro,
      p: exhibition.phoneIds.slice(0, MAX_PHONES_PER_EXHIBITION),
    }
    const json = JSON.stringify(payload)
    const raw = new TextEncoder().encode(json)
    let encoded: string
    try {
      encoded = 'z1.' + bytesToBase64url(await deflateRaw(raw))
    } catch {
      encoded = 'r1.' + bytesToBase64url(raw) // 环境不支持压缩时退化为原始编码
    }
    const base = `${location.origin}${import.meta.env.BASE_URL}${
      import.meta.env.MODE === 'github' ? '#/exhibition/share/' : 'exhibition/share/'
    }`
    const url = base + encoded
    if (url.length > MAX_URL_LENGTH) return { ok: false, reason: 'too-large' }
    return { ok: true, url }
  },

  /** 解析分享 URL → 展览内容（含解析出的展品详情）。 */
  async parseShareUrl(
    payload: string,
  ): Promise<{ title: string; intro?: string; phones: Phone[] } | null> {
    try {
      let json: string
      if (payload.startsWith('z1.')) {
        json = new TextDecoder().decode(await inflateRaw(base64urlToBytes(payload.slice(3))))
      } else if (payload.startsWith('r1.')) {
        json = new TextDecoder().decode(base64urlToBytes(payload.slice(3)))
      } else {
        return null
      }
      const parsed = JSON.parse(json) as SharePayload
      if (!parsed || typeof parsed.t !== 'string' || !Array.isArray(parsed.p)) return null
      const all = await phoneService.getPhones()
      const byId = new Map(all.map((p) => [p.id, p]))
      const phones = parsed.p
        .slice(0, MAX_PHONES_PER_EXHIBITION)
        .map((id) => byId.get(id))
        .filter((p): p is Phone => Boolean(p))
      return { title: parsed.t, intro: typeof parsed.i === 'string' ? parsed.i : undefined, phones }
    } catch {
      return null
    }
  },
}
