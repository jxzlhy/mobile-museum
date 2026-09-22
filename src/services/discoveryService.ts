import { phoneService } from './phoneService'
import type { MuseumDiscovery } from '@/data/types'

// Discovery Service（V0.4 规范 §38 / §40 / §72 / V0.5 规范 §26–§28）：
// 参观行为（查看展品 / 打开展厅展签 / 进入珍藏 / 查看 3D）只记录一次。
// 统一键位 museum.discovery；自动迁移 V0.4 旧键位。全部 localStorage，不上传。

const STORAGE_KEY = 'museum.discovery'
const LEGACY_KEY = 'mobile-museum:discoveries'

type Listener = (d: MuseumDiscovery) => void
const listeners = new Set<Listener>()

function read(): MuseumDiscovery[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (v): v is MuseumDiscovery =>
          typeof v === 'object' && v !== null && typeof (v as MuseumDiscovery).phoneId === 'string',
      )
      .map((v) => ({
        phoneId: v.phoneId,
        discoveredAt: typeof v.discoveredAt === 'number' ? v.discoveredAt : Date.now(),
        source: v.source,
      }))
  } catch {
    return []
  }
}

function write(items: MuseumDiscovery[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export type DiscoverySource = 'view' | 'hall' | 'treasure'

export const discoveryService = {
  /** 记录一次发现；首次发现时返回记录并通知订阅者，重复发现返回 null（规范 §40：只记录一次）。 */
  discover(phoneId: string, source?: DiscoverySource): MuseumDiscovery | null {
    if (!phoneId) return null
    const items = read()
    if (items.some((d) => d.phoneId === phoneId)) return null
    const record: MuseumDiscovery = { phoneId, discoveredAt: Date.now(), source }
    items.push(record)
    write(items)
    listeners.forEach((cb) => cb(record))
    return record
  },

  hasDiscovered(phoneId: string): boolean {
    return read().some((d) => d.phoneId === phoneId)
  },

  getDiscoveries(): MuseumDiscovery[] {
    return read().slice().sort((a, b) => a.discoveredAt - b.discoveredAt)
  },

  /** 总进度（规范 §42）：如 12 / 50。 */
  async getProgress(): Promise<{ discovered: number; total: number }> {
    const [items, all] = await Promise.all([Promise.resolve(read()), phoneService.getPhones()])
    return { discovered: items.length, total: all.length }
  },

  /** 订阅新发现（用于全局 EXHIBIT DISCOVERED 提示）。返回取消函数。 */
  onChange(cb: Listener): () => void {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
}
