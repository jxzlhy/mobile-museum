import type { CollectionItem } from '@/data/types'

// 个人收藏持久化（规范 §44–§45）：
// 新键位 mobile-museum:collection，存 CollectionItem（含加入时间与序号）；
// 自动迁移 V0.1 的旧键位（纯 id 数组）。

const STORAGE_KEY = 'mobile-museum:collection'
const LEGACY_KEY = 'mm.collection.v1'

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
    // 迁移 V0.1 旧数据
    const legacyRaw = localStorage.getItem(LEGACY_KEY)
    if (legacyRaw) {
      const legacy: unknown = JSON.parse(legacyRaw)
      if (Array.isArray(legacy)) {
        const migrated = legacy
          .filter((v): v is string => typeof v === 'string')
          .map((phoneId, i) => ({ phoneId, addedAt: Date.now(), order: i }))
        write(migrated)
        return migrated
      }
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
