import { getJourneys, getJourneyById, type DiscoveryPath, type DiscoveryStop } from '@/data/journeys'
import { phoneService } from './phoneService'
import type { Phone } from '@/data/types'

// ============================================================
// Journey Service（V0.6 规范 §16–§18 / §43 / §54 / §56）：
// 参观进度存 museum.journeyProgress；?stop=n 可恢复位置；
// 与 collection / discovery / memory / exhibition 严格分离（§55）。
// ============================================================

const STORAGE_KEY = 'museum.journeyProgress'

export interface JourneyProgress {
  journeyId: string
  completedStops: string[]
  currentStop?: string
  startedAt: number
  updatedAt: number
}

export interface JourneyStopView {
  index: number
  stop: DiscoveryStop
  phone?: Phone
}

function read(): Record<string, JourneyProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as Record<string, JourneyProgress>
  } catch {
    return {}
  }
}

function write(all: Record<string, JourneyProgress>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

function normalizeStopKey(stop: DiscoveryStop): string {
  return stop.phoneId ?? stop.storyId ?? stop.technologyId ?? stop.eventId ?? ''
}

export const journeyService = {
  async getJourneys(): Promise<Array<DiscoveryPath & { stopPhones: Phone[] }>> {
    const journeys = getJourneys()
    return Promise.all(
      journeys.map(async (j) => ({
        ...j,
        stopPhones: await phoneService.resolveMany(j.stops.map((s) => s.phoneId ?? '')),
      })),
    )
  },

  async getJourney(id: string): Promise<(DiscoveryPath & { stopViews: JourneyStopView[] }) | undefined> {
    const journey = getJourneyById(id)
    if (!journey) return undefined
    const stopViews: JourneyStopView[] = []
    for (let i = 0; i < journey.stops.length; i++) {
      const stop = journey.stops[i]!
      const phone = stop.phoneId ? await phoneService.getPhoneById(stop.phoneId) : undefined
      stopViews.push({ index: i, stop, phone })
    }
    return { ...journey, stopViews }
  },

  getProgress(journeyId: string): JourneyProgress | undefined {
    return read()[journeyId]
  },

  getAllProgress(): Record<string, JourneyProgress> {
    return read()
  },

  /** 标记某站已参观（进入 stop 时调用，§17：不强制完成）。 */
  markStop(journeyId: string, stopIndex: number) {
    const journey = getJourneyById(journeyId)
    if (!journey) return
    const stopKey = normalizeStopKey(journey.stops[stopIndex] ?? ({} as DiscoveryStop))
    if (!stopKey) return
    const all = read()
    const existing = all[journeyId]
    const progress: JourneyProgress = existing ?? {
      journeyId,
      completedStops: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
    }
    if (!progress.completedStops.includes(stopKey)) progress.completedStops.push(stopKey)
    progress.currentStop = String(stopIndex)
    progress.updatedAt = Date.now()
    all[journeyId] = progress
    write(all)
  },

  /** 离开路线时记录当前位置（§43 恢复用）。 */
  setCurrent(journeyId: string, stopIndex: number) {
    const all = read()
    const existing = all[journeyId]
    if (!existing) return
    existing.currentStop = String(stopIndex)
    existing.updatedAt = Date.now()
    write(all)
  },

  clearProgress(journeyId: string) {
    const all = read()
    delete all[journeyId]
    write(all)
  },
}
