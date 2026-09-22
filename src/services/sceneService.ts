import { getSceneById, type HistoricalScene, type HistoricalSceneObject } from '@/data/scenes'
import { phoneService } from './phoneService'
import { museumService, type ExhibitRecommendation } from './museumService'
import type { Phone } from '@/data/types'

// Scene Service（V0.7 规范 §70）：场景对象的解析与来源。
// Related Objects 必须来自已有关系（§72 → museumService.getRecommendations）。

export interface SceneObjectResolved {
  object: HistoricalSceneObject
  phone?: Phone
}

export const sceneService = {
  async getScene(id: string): Promise<HistoricalScene | undefined> {
    return getSceneById(id)
  },

  async getObjects(id: string): Promise<SceneObjectResolved[]> {
    const scene = getSceneById(id)
    if (!scene) return []
    const out: SceneObjectResolved[] = []
    for (const object of scene.objects) {
      if (object.type === 'phone' && object.refId) {
        out.push({ object, phone: await phoneService.getPhoneById(object.refId) })
      } else {
        out.push({ object })
      }
    }
    return out
  },

  /** 场景相关展品（可解释，§73）。 */
  async getRelated(id: string, limit = 3): Promise<ExhibitRecommendation[]> {
    const scene = getSceneById(id)
    if (!scene || scene.featuredPhoneIds.length === 0) return []
    return museumService.getRecommendations(scene.featuredPhoneIds[0]!, limit)
  },

  /** 场景来源（§38–§40）：复用展品来源体系，不建第二套。 */
  async getSources(id: string): Promise<{
    sceneType: HistoricalScene['sceneType']
    curatedBy: string
    sourceIds: string[]
    phoneCredits: Array<{ id: string; name: string; sources: string[] }>
  }> {
    const scene = getSceneById(id)
    const phoneCredits: Array<{ id: string; name: string; sources: string[] }> = []
    if (scene) {
      for (const phoneId of scene.featuredPhoneIds) {
        const phone = await phoneService.getPhoneById(phoneId)
        if (phone) {
          phoneCredits.push({
            id: phone.id,
            name: phone.name,
            sources: phone.sources.map((s) => s.note ?? s.title ?? ''),
          })
        }
      }
    }
    const scene0 = scene as HistoricalScene | undefined
    return {
      sceneType: scene0?.sceneType ?? 'curated',
      curatedBy: scene0?.curatedBy ?? 'MOBILE MUSEUM',
      sourceIds: scene0?.sourceIds ?? [],
      phoneCredits,
    }
  },
}
