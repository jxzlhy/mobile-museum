import { stories, getStoriesData } from '@/data/stories'
import type { MuseumStory } from '@/data/stories'

// Story Service（V0.3 §24）：页面不直接读数据文件。

export const storyService = {
  async getStories(): Promise<MuseumStory[]> {
    return getStoriesData()
  },

  async getStory(id: string): Promise<MuseumStory | undefined> {
    return stories.find((s) => s.id === id)
  },

  async getStoriesByTag(tag: string): Promise<MuseumStory[]> {
    return stories.filter((s) => (s.tags ?? []).includes(tag))
  },
}
