import type { BlockType, ExhibitionBlock } from './types'
import {
  MAX_BLOCKS,
  MAX_EXHIBIT_BLOCKS,
  MAX_NOTE_LENGTH,
  MAX_TITLE_LENGTH,
  sanitizeText,
} from './types'
import { phoneService } from '../phoneService'
import { getScenesData } from '@/data/scenes'

// ============================================================
// Block Registry（V0.8 规范 §46–§48）：
// 元数据 + 默认数据 + 校验器集中注册，避免 if type === ... 散落。
// 渲染组件在 components/curator/blocks 侧按 type 动态解析。
// ============================================================

export interface BlockMeta {
  type: BlockType
  label: string
  labelZh: string
  icon: string
}

export const BLOCK_METAS: BlockMeta[] = [
  { type: 'exhibit', label: 'EXHIBIT', labelZh: '展品', icon: '◈' },
  { type: 'text', label: 'CURATOR NOTE', labelZh: '注释', icon: '¶' },
  { type: 'quote', label: 'QUOTE', labelZh: '引言', icon: '❝' },
  { type: 'timeline', label: 'TIMELINE', labelZh: '时间线', icon: '—●—' },
  { type: 'comparison', label: 'COMPARISON', labelZh: '对比', icon: '⇄' },
  { type: 'graph', label: 'GRAPH', labelZh: '关系', icon: '⋈' },
  { type: 'time-machine', label: 'TIME MACHINE', labelZh: '场景', icon: '⧗' },
  { type: 'image', label: 'IMAGE', labelZh: '图版', icon: '▣' },
  { type: 'transition', label: 'TRANSITION', labelZh: '分隔', icon: '·' },
]

const metaByType = new Map(BLOCK_METAS.map((m) => [m.type, m]))

export const blockRegistry = {
  get(type: BlockType): BlockMeta | undefined {
    return metaByType.get(type)
  },

  all(): BlockMeta[] {
    return BLOCK_METAS
  },

  /** 校验（§47）：返回错误信息或 null。异步校验需要查数据的引用。 */
  async validate(block: ExhibitionBlock): Promise<string | null> {
    const d = block.data as Record<string, unknown>
    switch (block.type) {
      case 'exhibit': {
        if (typeof d.phoneId !== 'string' || !d.phoneId) return 'phoneId required'
        if (!(await phoneService.getPhoneById(d.phoneId))) return 'EXHIBIT UNAVAILABLE'
        if (d.note != null && typeof d.note !== 'string') return 'note must be text'
        return null
      }
      case 'text':
        return typeof d.text === 'string' && d.text.trim() ? null : 'text required'
      case 'quote':
        return typeof d.text === 'string' && d.text.trim() ? null : 'quote text required'
      case 'timeline':
        return d.mode === 'events' || d.mode === 'phones' ? null : 'mode required'
      case 'comparison': {
        if (typeof d.leftPhoneId !== 'string' || typeof d.rightPhoneId !== 'string') return 'leftPhoneId / rightPhoneId required'
        if (d.leftPhoneId === d.rightPhoneId) return '不能选择同一台设备'
        const [a, b] = await Promise.all([phoneService.getPhoneById(d.leftPhoneId), phoneService.getPhoneById(d.rightPhoneId)])
        if (!a || !b) return 'EXHIBIT UNAVAILABLE'
        return null
      }
      case 'graph':
        return typeof d.focusId === 'string' && d.focusId.includes(':') ? null : 'focusId required'
      case 'time-machine': {
        if (typeof d.year !== 'number') return 'year required'
        if (d.sceneId && !getScenesData().some((s) => s.id === d.sceneId)) return 'SCENE UNAVAILABLE'
        return null
      }
      case 'image': {
        if (typeof d.phoneId !== 'string' || !d.phoneId) return 'phoneId required'
        if (!(await phoneService.getPhoneById(d.phoneId))) return 'EXHIBIT UNAVAILABLE'
        return null
      }
      case 'transition':
        return null
      default:
        return 'CONTENT UNAVAILABLE'
    }
  },

  /** 整展校验（§29 限制）。 */
  validateLimits(blocks: ExhibitionBlock[]): string | null {
    if (blocks.length > MAX_BLOCKS) return `一个展览最多 ${MAX_BLOCKS} 个 Block`
    const exhibits = blocks.filter((b) => b.type === 'exhibit' || b.type === 'image').length
    if (exhibits > MAX_EXHIBIT_BLOCKS) return `展品 Block 最多 ${MAX_EXHIBIT_BLOCKS} 个`
    return null
  },
}

/** 各 Block 的默认数据（新建时）。 */
export function defaultBlockData(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'exhibit':
      return { phoneId: '', displayMode: 'photo' }
    case 'text':
      return { text: '' }
    case 'quote':
      return { text: '' }
    case 'timeline':
      return { mode: 'events' }
    case 'comparison':
      return { leftPhoneId: '', rightPhoneId: '' }
    case 'graph':
      return { focusId: 'phone:nokia-3310' }
    case 'time-machine':
      return { year: 2007, sceneId: 'scene-2007' }
    case 'image':
      return { phoneId: '', angle: 'hero' }
    case 'transition':
      return { label: '' }
  }
}

/** 从分享/导入 payload 中安全清洗 Block 数据（§34）。 */
export function sanitizeBlockData(type: BlockType, raw: unknown): Record<string, unknown> {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown, max = MAX_NOTE_LENGTH) => sanitizeText(v, max)
  switch (type) {
    case 'exhibit':
      return { phoneId: str(d.phoneId, 80), titleOverride: d.titleOverride ? str(d.titleOverride, MAX_TITLE_LENGTH) : undefined, note: d.note ? str(d.note) : undefined, displayMode: ['photo', '3d', 'minimal'].includes(String(d.displayMode)) ? d.displayMode : 'photo' }
    case 'text':
      return { text: str(d.text, 2000) }
    case 'quote':
      return { text: str(d.text, 1000) }
    case 'timeline':
      return { mode: d.mode === 'phones' ? 'phones' : 'events', yearFrom: typeof d.yearFrom === 'number' ? d.yearFrom : undefined, yearTo: typeof d.yearTo === 'number' ? d.yearTo : undefined, hiddenIds: Array.isArray(d.hiddenIds) ? d.hiddenIds.map((v) => str(v, 80)) : undefined, order: Array.isArray(d.order) ? d.order.map((v) => str(v, 80)) : undefined }
    case 'comparison':
      return { leftPhoneId: str(d.leftPhoneId, 80), rightPhoneId: str(d.rightPhoneId, 80), label: d.label ? str(d.label, MAX_TITLE_LENGTH) : undefined }
    case 'graph':
      return { focusId: str(d.focusId, 80) }
    case 'time-machine':
      return { year: typeof d.year === 'number' ? d.year : 2007, sceneId: d.sceneId ? str(d.sceneId, 80) : undefined, relatedPhoneIds: Array.isArray(d.relatedPhoneIds) ? d.relatedPhoneIds.map((v) => str(v, 80)) : undefined }
    case 'image':
      return { phoneId: str(d.phoneId, 80), angle: ['hero', 'front', 'back', 'side', 'detail'].includes(String(d.angle)) ? d.angle : 'hero' }
    case 'transition':
      return { label: d.label ? str(d.label, MAX_TITLE_LENGTH) : undefined }
    default:
      return {}
  }
}
