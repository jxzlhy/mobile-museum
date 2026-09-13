import { events } from '@/data/events'
import type { HistoricalEvent } from '@/data/types'

export const eventService = {
  async getEvents(): Promise<HistoricalEvent[]> {
    return [...events].sort((a, b) => a.year - b.year)
  },

  async getEventsForPhone(phoneId: string): Promise<HistoricalEvent[]> {
    return events.filter((e) => e.relatedPhones?.includes(phoneId)).sort((a, b) => a.year - b.year)
  },
}
