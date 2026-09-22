import { phoneService } from './phoneService'
import {
  getScenesData,
  getSceneById,
  scenePhoneRefs,
  getTechnologyMomentsData,
  getCultureData,
  technologyMoments,
  cultureNodes,
  CURRENT_REFERENCE_PHONE_ID,
  THEN_NOW_LABELS,
  type HistoricalScene,
  type HistoricalSceneObject,
  type ThenNowDimension,
  type SceneChapter,
} from '@/data/scenes'
import { contextService } from './contextService'
import { museumService, type ExhibitRecommendation } from './museumService'
import type { Phone } from '@/data/types'

// ============================================================
// Time Machine Service（V0.7 规范 §69–§73 / §88 / §55 / §52）：
// getYears / getEra / getScene / getNextScene / getPreviousScene。
// Era Snapshot 复用 V0.6 contextService（§71），不复制数据；
// Related Objects 来自已有关系（§72）。
// 访问记忆存 museum.sceneVisits（§52），续访存 museum.preferences（§55）。
// ============================================================

const PREF_LAST_SCENE = 'timeMachine.lastScene'
const SCENE_VISITS_KEY = 'museum.sceneVisits'
const SCENE_VISITS_MAX = 10

export interface SceneObjectView {
  object: HistoricalSceneObject
  /** phone 对象的解析结果（其余类型为 undefined）。 */
  phone?: Phone
}

export interface SceneView {
  scene: HistoricalScene
  hero: Phone | undefined
  /** 场景对象（已解析），保持前景/中景/背景层次（§64）。 */
  objects: SceneObjectView[]
  chapters: Array<SceneChapter & { phones: Phone[] }>
  /** Era Snapshot（§8，来自 contextService，§71）。 */
  era: Awaited<ReturnType<typeof contextService.getContext>>
  /** THEN / NOW（§21）：then = 场景代表机，now = 现役参照机（数据来自 specs）。 */
  thenNow: { hero: Phone | undefined; reference: Phone | undefined; dimensions: ThenNowDimension[] }
  /** 技术瞬间（§23–§25）。 */
  moments: Array<(typeof technologyMoments)[number] & { phones: Phone[] }>
  /** 文化层（§26–§27）。 */
  culture: Array<(typeof cultureNodes)[number] & { phones: Phone[] }>
  /** NEXT ERA（§43–§44）。 */
  next: HistoricalScene | undefined
  previous: HistoricalScene | undefined
  /** 额外的可解释推荐（§73）。 */
  recommendations: ExhibitRecommendation[]
}

const PREF_KEY = 'museum.preferences'

function readPref(key: string): string | null {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed[key] ?? null
  } catch {
    return null
  }
}

function writePref(key: string, value: string) {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    parsed[key] = value
    localStorage.setItem(PREF_KEY, JSON.stringify(parsed))
  } catch {
    /* ignore */
  }
}

function readSceneVisits(): Array<{ sceneId: string; visitedAt: number }> {
  try {
    const raw = localStorage.getItem(SCENE_VISITS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v): v is { sceneId: string; visitedAt: number } =>
        typeof v === 'object' && v !== null && typeof (v as { sceneId?: unknown }).sceneId === 'string')
      .map((v) => ({ sceneId: v.sceneId, visitedAt: typeof v.visitedAt === 'number' ? v.visitedAt : 0 }))
  } catch {
    return []
  }
}

function thenNowDimensions(hero: Phone | undefined, reference: Phone | undefined): ThenNowDimension[] {
  if (!hero || !reference) return []
  const dims: ThenNowDimension[] = []
  for (const label of THEN_NOW_LABELS) {
    if (label.key === 'screen') {
      dims.push({
        key: 'screen',
        label: label.label,
        thenValue: hero.specs?.displaySize,
        nowValue: reference.specs?.displaySize,
        unit: label.unit,
      })
    } else if (label.key === 'camera') {
      const cam = (p: Phone) => p.specs?.camera?.split('（')[0]?.split(' + ')[0]
      if (cam(hero) || cam(reference)) {
        dims.push({ key: 'camera', label: label.label, thenValue: cam(hero), nowValue: cam(reference), unit: label.unit })
      }
    } else if (label.key === 'network') {
      const net = (p: Phone) => p.specs?.network?.[0]
      if (net(hero) || net(reference)) {
        dims.push({ key: 'network', label: label.label, thenValue: net(hero), nowValue: net(reference), unit: label.unit })
      }
    } else if (label.key === 'weight') {
      dims.push({
        key: 'weight',
        label: label.label,
        thenValue: hero.specs?.weight,
        nowValue: reference.specs?.weight,
        unit: label.unit,
      })
    }
  }
  return dims
}

/** 开发模式数据完整性校验（规范 §88）：发现坏 ID 打 DATA INTEGRITY ERROR，生产降级。 */
function validateScenes(dev: boolean) {
  if (!dev) return
  void (async () => {
    const all = await phoneService.getPhones()
    const ids = new Set(all.map((p) => p.id))
    for (const scene of getScenesData()) {
      const bad = scenePhoneRefs(scene).filter((id) => !ids.has(id))
      if (bad.length > 0) {
        console.error(`[TimeMachine] DATA INTEGRITY ERROR in ${scene.id}: unknown phoneIds ${bad.join(', ')}`)
      }
    }
  })()
}

let validated = false

export const timeMachineService = {
  /** 场景年份（§69 getYears）。 */
  getYears(): number[] {
    return getScenesData().map((s) => s.year).sort((a, b) => a - b)
  },

  getAllScenes(): HistoricalScene[] {
    return getScenesData().slice().sort((a, b) => a.year - b.year)
  },

  getSceneMeta(id: string) {
    const s = getSceneById(id)
    return s ? { id: s.id, title: s.title, year: s.year, type: s.sceneType, sourceIds: s.sourceIds ?? [] } : undefined
  },

  /** Era Snapshot（§8 / §71：直接复用 V0.6 Context）。 */
  async getEra(year: number) {
    return contextService.getContext(year)
  },

  /** 续访（§55）：CONTINUE YOUR VISIT · 2007。 */
  getLastSceneYear(): number | null {
    const raw = readPref(PREF_LAST_SCENE)
    const year = raw ? Number(raw) : NaN
    return Number.isFinite(year) ? year : null
  },

  async recordVisit(year: number) {
    const scene = getScenesData().find((s) => s.year === year)
    if (!scene) return
    writePref(PREF_LAST_SCENE, String(year))
    const visits = readSceneVisits().filter((v) => v.sceneId !== scene.id)
    visits.unshift({ sceneId: scene.id, visitedAt: Date.now() })
    try {
      localStorage.setItem(SCENE_VISITS_KEY, JSON.stringify(visits.slice(0, SCENE_VISITS_MAX)))
    } catch {
      /* ignore */
    }
  },

  /** 最近历史访问（§52 / §96）：最多 10 个场景。 */
  getRecentSceneVisits(): Array<{ sceneId: string; visitedAt: number }> {
    return readSceneVisits().slice(0, SCENE_VISITS_MAX)
  },

  /** 场景完整视图（§34：Hero → Related → Secondary 的加载顺序由 view 控制）。 */
  async getScene(year: number, dev = import.meta.env.DEV): Promise<SceneView | null> {
    if (!validated) {
      validated = true
      validateScenes(dev)
    }
    const scene = getScenesData().find((s) => s.year === year)
    if (!scene) return null

    const hero = await phoneService.getPhoneById(scene.featuredPhoneIds[0] ?? '')
    const objects: SceneObjectView[] = []
    for (const object of scene.objects) {
      if (object.type === 'phone' && object.refId) {
        objects.push({ object, phone: await phoneService.getPhoneById(object.refId) })
      } else {
        objects.push({ object })
      }
    }
    const chapters = await Promise.all(
      scene.chapters.map(async (c) => ({ ...c, phones: await phoneService.resolveMany(c.phoneIds ?? []) })),
    )
    const era = await contextService.getContext(year)
    const reference = await phoneService.getPhoneById(CURRENT_REFERENCE_PHONE_ID)
    const moments = await Promise.all(
      getTechnologyMomentsData()
        .filter((m) => scene.technologyIds?.includes(m.technologyId) || m.year === year)
        .map(async (m) => ({ ...m, phones: await phoneService.resolveMany(m.phoneIds ?? []) })),
    )
    const culture = await Promise.all(
      getCultureData()
        .filter((c) => (c.relatedPhoneIds ?? []).some((id) => scenePhoneRefs(scene).includes(id)))
        .map(async (c) => ({ ...c, phones: await phoneService.resolveMany(c.relatedPhoneIds ?? []) })),
    )
    const sorted = this.getAllScenes()
    const idx = sorted.findIndex((s) => s.year === year)
    const recommendations = hero ? await museumService.getRecommendations(hero.id, 3) : []

    return {
      scene,
      hero,
      objects,
      chapters,
      era,
      thenNow: { hero, reference, dimensions: thenNowDimensions(hero, reference) },
      moments,
      culture,
      next: sorted[idx + 1],
      previous: sorted[idx - 1],
      recommendations,
    }
  },

  getNextScene(year: number): HistoricalScene | undefined {
    const sorted = this.getAllScenes()
    return sorted[sorted.findIndex((s) => s.year === year) + 1]
  },

  getPreviousScene(year: number): HistoricalScene | undefined {
    const sorted = this.getAllScenes()
    return sorted[sorted.findIndex((s) => s.year === year) - 1]
  },
}
