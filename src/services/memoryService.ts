import { phoneService } from './phoneService'
import type { Phone } from '@/data/types'

// ============================================================
// Memory Service（V0.5 规范 §25–§28 / §54）：
// RECENTLY VISITED —— 我最近看过的。最多 20 台，同一台再次访问
// 移到顶部。与 COLLECTION（收藏的）/ DISCOVERY（首次发现过的）/
// EXHIBITION（策展的）严格分离（§26），只共用 phoneId。
// 键位 museum.memory。
// ============================================================

const STORAGE_KEY = 'museum.memory'
const MAX = 20

export interface MemoryItem {
  phoneId: string
  visitedAt: number
}

function read(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (v): v is MemoryItem =>
          typeof v === 'object' && v !== null && typeof (v as MemoryItem).phoneId === 'string',
      )
      .map((v) => ({ phoneId: v.phoneId, visitedAt: typeof v.visitedAt === 'number' ? v.visitedAt : 0 }))
  } catch {
    return []
  }
}

function write(items: MemoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX)))
  } catch {
    /* ignore */
  }
}

export const memoryService = {
  /** 记录一次访问；已在列表中则移动到顶部（§25）。 */
  visit(phoneId: string) {
    if (!phoneId) return
    const items = read().filter((v) => v.phoneId !== phoneId)
    items.unshift({ phoneId, visitedAt: Date.now() })
    write(items)
  },

  /** 最近访问（新→旧），最多 20 台。 */
  async getRecent(limit = MAX): Promise<Phone[]> {
    const items = read().slice(0, limit)
    const all = await phoneService.getPhones()
    const byId = new Map(all.map((p) => [p.id, p]))
    return items.map((v) => byId.get(v.phoneId)).filter((p): p is Phone => Boolean(p))
  },

  async getRecentItems(): Promise<MemoryItem[]> {
    return read().slice(0, MAX)
  },

  hasVisited(phoneId: string): boolean {
    return read().some((v) => v.phoneId === phoneId)
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  },
}
