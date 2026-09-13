import { technologies } from '@/data/technologies'
import type { Technology } from '@/data/types'

export const technologyService = {
  async getTechnologies(): Promise<Technology[]> {
    return technologies
  },

  async getTechnologyById(id: string): Promise<Technology | undefined> {
    return technologies.find((t) => t.id === id)
  },
}
