import { ref, computed, watch } from 'vue'
import { collectionService } from '@/services/collectionService'
import { phoneService } from '@/services/phoneService'
import type { CollectionItem } from '@/data/types'
import type { Phone } from '@/data/types'

// 我的手机史（规范 §43–§48）：
// 默认按 releaseYear 升序（历史时间线），可切换"按加入顺序"；
// 数据模型为 CollectionItem（含 addedAt / order）。

const items = ref<CollectionItem[]>(collectionService.load())
const sortMode = ref<'era' | 'added'>('era')
const phonesById = ref<Map<string, Phone>>(new Map())
let loaded = false

async function ensurePhones() {
  if (loaded) return
  loaded = true
  const all = await phoneService.getPhones()
  phonesById.value = new Map(all.map((p) => [p.id, p]))
}
void ensurePhones()

let persist: (() => void) | null = null

export function useCollection() {
  if (!persist) {
    persist = () => collectionService.save(items.value.map((v, i) => ({ ...v, order: i })))
    watch(items, persist, { deep: true })
  }

  const hasPhone = (id: string) => items.value.some((v) => v.phoneId === id)

  const addPhone = (id: string) => {
    if (!items.value.some((v) => v.phoneId === id)) {
      items.value.push({ phoneId: id, addedAt: Date.now(), order: items.value.length })
    }
  }

  const removePhone = (id: string) => {
    items.value = items.value.filter((v) => v.phoneId !== id)
  }

  const togglePhone = (id: string) => {
    if (hasPhone(id)) removePhone(id)
    else addPhone(id)
  }

  const movePhone = (id: string, dir: -1 | 1) => {
    const arr = [...items.value]
    const i = arr.findIndex((v) => v.phoneId === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    items.value = arr
  }

  const clearCollection = () => {
    items.value = []
    collectionService.clear()
  }

  /** 当前排序下的收藏展品。 */
  const collectionPhones = computed(() => {
    const resolved = items.value
      .map((v) => phonesById.value.get(v.phoneId))
      .filter((p): p is Phone => Boolean(p))
      .map((p, i) => ({ phone: p, addedIndex: i }))
    if (sortMode.value === 'added') {
      return resolved.sort((a, b) => a.addedIndex - b.addedIndex).map((r) => r.phone)
    }
    return [...resolved].map((r) => r.phone).sort((a, b) => a.releaseYear - b.releaseYear)
  })

  /** 展区统计（规范 §48）：数据不足时不展示对应项。 */
  const stats = computed(() => {
    const list = collectionPhones.value
    if (list.length === 0) return null
    const years = list.map((p) => p.releaseYear)
    const oldest = list.reduce((a, b) => (a.releaseYear <= b.releaseYear ? a : b))
    const newest = list.reduce((a, b) => (a.releaseYear >= b.releaseYear ? a : b))
    return {
      deviceCount: list.length,
      brandCount: new Set(list.map((p) => p.brandId)).size,
      oldest,
      newest,
      span: years.length > 1 ? { from: Math.min(...years), to: Math.max(...years) } : null,
    }
  })

  return {
    items,
    sortMode,
    collectionPhones,
    stats,
    hasPhone,
    addPhone,
    removePhone,
    togglePhone,
    movePhone,
    clearCollection,
  }
}
