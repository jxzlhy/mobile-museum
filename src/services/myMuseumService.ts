import { phoneService } from './phoneService'
import { museumService } from './museumService'
import { collectionService } from './collectionService'
import { discoveryService } from './discoveryService'
import type { Phone } from '@/data/types'

// ============================================================
// My Museum Service（规范 §34–§37 / §73）：
// 「我的博物馆」全部数据 —— 概览、我的时代（简单规则，规范 §36）、
// 收藏清单、护照进度。全部本地计算，不上传（规范 §37）。
// ============================================================

export type MuseumEraId = 'feature-phone' | 'touchscreen' | 'smartphone' | 'foldable'

export interface MyEra {
  id: MuseumEraId
  en: string
  zh: string
  note: string
}

const ERAS: Record<MuseumEraId, MyEra> = {
  'feature-phone': {
    id: 'feature-phone',
    en: 'FEATURE PHONE ERA',
    zh: '功能机时代',
    note: '按键与听筒的年代——手机首先是电话。',
  },
  touchscreen: {
    id: 'touchscreen',
    en: 'TOUCHSCREEN ERA',
    zh: '触屏时代',
    note: '2007 年之后，屏幕成了整台手机。',
  },
  smartphone: {
    id: 'smartphone',
    en: 'SMARTPHONE ERA',
    zh: '智能手机时代',
    note: '口袋里的计算机，掌心里的世界。',
  },
  foldable: {
    id: 'foldable',
    en: 'FOLDABLE ERA',
    zh: '折叠屏时代',
    note: '屏幕再次开始折叠，形态重新自由。',
  },
}

export interface PassportRow {
  id: string
  en: string
  zh: string
  discovered: number
  total: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

export const myMuseumService = {
  async getSummary(): Promise<{
    deviceCount: number
    brandCount: number
    discoveryCount: number
    span: { from: number; to: number } | null
  }> {
    const [itemIds, all, discoveries] = await Promise.all([
      Promise.resolve(collectionService.load().map((v) => v.phoneId)),
      phoneService.getPhones(),
      Promise.resolve(discoveryService.getDiscoveries()),
    ])
    const byId = new Map(all.map((p) => [p.id, p]))
    const phones = itemIds.map((id) => byId.get(id)).filter((p): p is Phone => Boolean(p))
    const years = phones.map((p) => p.releaseYear)
    return {
      deviceCount: phones.length,
      brandCount: new Set(phones.map((p) => p.brandId)).size,
      discoveryCount: discoveries.length,
      span: years.length > 1 ? { from: Math.min(...years), to: Math.max(...years) } : null,
    }
  },

  /** 我的时代（规范 §36）：formFactor / releaseYear / technologies 的简单规则，非 AI。 */
  async getEra(): Promise<MyEra | null> {
    const itemIds = collectionService.load().map((v) => v.phoneId)
    if (itemIds.length === 0) return null
    const all = await phoneService.getPhones()
    const byId = new Map(all.map((p) => [p.id, p]))
    const phones = itemIds.map((id) => byId.get(id)).filter((p): p is Phone => Boolean(p))
    if (phones.length === 0) return null

    if (phones.some((p) => p.formFactor === 'foldable')) return ERAS.foldable
    const midYear = median(phones.map((p) => p.releaseYear))
    if (midYear >= 2013) return ERAS.smartphone
    if (midYear >= 2007) return ERAS.touchscreen
    return ERAS['feature-phone']
  },

  async getCollection(): Promise<Phone[]> {
    const itemIds = collectionService.load().map((v) => v.phoneId)
    const all = await phoneService.getPhones()
    const byId = new Map(all.map((p) => [p.id, p]))
    return itemIds.map((id) => byId.get(id)).filter((p): p is Phone => Boolean(p))
  },

  /** 博物馆护照（规范 §39）：探索记录，不是游戏积分。 */
  async getPassport(): Promise<{ discovered: number; total: number; rows: PassportRow[] }> {
    const [all, rooms, discoveries] = await Promise.all([
      phoneService.getPhones(),
      museumService.getRooms(),
      Promise.resolve(discoveryService.getDiscoveries()),
    ])
    const discoveredIds = new Set(discoveries.map((d) => d.phoneId))
    const discoveredPhones = all.filter((p) => discoveredIds.has(p.id))
    const byId = new Map(all.map((p) => [p.id, p]))

    const zoneRow = async (id: string, en: string, zh: string): Promise<PassportRow> => {
      const room = rooms.find((r) => r.id === id)
      const ids = room?.exhibitIds ?? []
      return {
        id,
        en,
        zh,
        discovered: ids.filter((pid) => discoveredIds.has(pid)).length,
        total: ids.length,
      }
    }

    const rows: PassportRow[] = [
      await zoneRow('history', 'HISTORY', '历史'),
      await zoneRow('design', 'DESIGN', '设计'),
      await zoneRow('technology', 'TECHNOLOGY', '技术'),
      await zoneRow('form-factor', 'FORM FACTOR', '形态'),
      {
        id: 'brands',
        en: 'BRANDS',
        zh: '品牌',
        discovered: new Set(discoveredPhones.map((p) => p.brandId)).size,
        total: new Set(all.map((p) => p.brandId)).size,
      },
      {
        id: 'eras',
        en: 'ERAS',
        zh: '年代',
        discovered: new Set(discoveredPhones.map((p) => byId.get(p.id)?.eraId).filter(Boolean)).size,
        total: new Set(all.map((p) => p.eraId).filter(Boolean)).size,
      },
    ]
    return { discovered: discoveredIds.size, total: all.length, rows }
  },
}
