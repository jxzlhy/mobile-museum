import type { CollectionItem } from '@/data/types'

// 个人收藏持久化（V0.4 规范 §44–§45 / V0.5 规范 §27–§28）：
// 统一键位 museum.collection；自动迁移旧键位（V0.4 的
// mobile-museum:collection 与 V0.1 的 mm.collection.v1），不丢数据。

const STORAGE_KEY = 'museum.collection'
const LEGACY_KEYS = ['mobile-museum:collection', 'mm.collection.v1']

function read(): CollectionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (v): v is CollectionItem =>
              typeof v === 'object' && v !== null && typeof (v as CollectionItem).phoneId === 'string',
          )
          .map((v, i) => ({
            phoneId: v.phoneId,
            addedAt: typeof v.addedAt === 'number' ? v.addedAt : Date.now(),
            order: typeof v.order === 'number' ? v.order : i,
          }))
      }
    }
    // 迁移旧数据（V0.4 / V0.1）
    for (const legacyKey of LEGACY_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey)
      if (!legacyRaw) continue
      const legacy: unknown = JSON.parse(legacyRaw)
      if (!Array.isArray(legacy)) continue
      const migrated = legacy
        .map((v, i): CollectionItem | null => {
          if (typeof v === 'string') return { phoneId: v, addedAt: Date.now(), order: i }
          if (typeof v === 'object' && v !== null && typeof (v as CollectionItem).phoneId === 'string') {
            const item = v as CollectionItem
            return {
              phoneId: item.phoneId,
              addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
              order: typeof item.order === 'number' ? item.order : i,
            }
          }
          return null
        })
        .filter((v): v is CollectionItem => v !== null)
      write(migrated)
      return migrated
    }
  } catch {
    /* 存储不可用时退化为内存态 */
  }
  return []
}

function write(items: CollectionItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export const collectionService = {
  load: read,
  save: write,
  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  },
}
