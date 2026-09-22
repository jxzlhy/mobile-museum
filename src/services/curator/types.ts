// ============================================================
// V0.8 Curator Studio —— Exhibition Schema（规范 §7–§16 / §29 / §33）
// 原则（§72）：只保存引用（Phone/Story/Event/Technology/Journey/
// Graph focus/Time Machine scene id），不复制任何历史数据。
// 用户只能修改展示层（titleOverride/note/displayMode），
// 不得覆盖官方事实（§9）。
// ============================================================

export type BlockType =
  | 'exhibit'
  | 'text'
  | 'quote'
  | 'timeline'
  | 'comparison'
  | 'graph'
  | 'time-machine'
  | 'image'
  | 'transition'

export interface ExhibitionBlock<T = unknown> {
  id: string
  type: BlockType
  data: T
  order: number
}

// ---- 各 Block 的数据（§8–§16）----

/** Exhibit Block（§9）：只允许展示层覆盖，禁止改事实。 */
export interface ExhibitBlockData {
  phoneId: string
  titleOverride?: string
  /** CURATOR NOTE（§10–§12）：个人注释，与 FACT 视觉区分。 */
  note?: string
  displayMode?: 'photo' | '3d' | 'minimal'
}

/** Text Block = CURATOR NOTE（§10）。 */
export interface TextBlockData {
  text: string
}

/** Quote Block：必须明确属于用户个人表达（§10）。 */
export interface QuoteBlockData {
  text: string
}

/** Timeline Block（§13）：引用 Event/Phone 数据，只保存显示控制。 */
export interface TimelineBlockData {
  mode: 'events' | 'phones'
  yearFrom?: number
  yearTo?: number
  hiddenIds?: string[]
  /** 自定义顺序（id 列表，缺省按年份）。 */
  order?: string[]
}

/** Comparison Block（§14）：只保存两个 phoneId。 */
export interface ComparisonBlockData {
  leftPhoneId: string
  rightPhoneId: string
  label?: string
}

/** Graph Block（§15）：只保存 focus。 */
export interface GraphBlockData {
  focusId: string
}

/** Time Machine Block（§16）：不复制场景数据。 */
export interface TimeMachineBlockData {
  year: number
  sceneId?: string
  relatedPhoneIds?: string[]
}

/** Image Block：引用 approved 资产角度，不上传、不生成。 */
export interface ImageBlockData {
  phoneId: string
  angle?: 'hero' | 'front' | 'back' | 'side' | 'detail'
}

/** Transition Block：章节分隔。 */
export interface TransitionBlockData {
  label?: string
}

// ---- Exhibition（§7）----

export interface CuratedExhibition {
  id: string
  title: string
  subtitle?: string
  intro?: string
  theme?: string
  coverPhoneId?: string
  blocks: ExhibitionBlock[]
  createdAt: number
  updatedAt: number
  version: number
  /** 本地状态：是否已发布（§45，不代表上传服务器）。 */
  published?: boolean
}

// ---- 限制（§29 / §12）----

export const MAX_BLOCKS = 30
export const MAX_EXHIBIT_BLOCKS = 20
export const MAX_EXHIBITIONS = 10
export const MAX_NOTE_LENGTH = 500
export const MAX_EXHIBITION_TEXT = 5000
export const MAX_TITLE_LENGTH = 80
export const MAX_INTRO_LENGTH = 500

// ---- 纯文本安全（§34 / §56）：长度限制 + 去控制字符 ----

export function sanitizeText(input: unknown, max = MAX_NOTE_LENGTH): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, max)
}

// ---- Block 工厂 ----

let seq = 0
export function newBlockId(): string {
  seq += 1
  return `blk-${Date.now().toString(36)}-${seq}-${Math.random().toString(36).slice(2, 6)}`
}

export function makeBlock<T>(type: BlockType, data: T, order = 0): ExhibitionBlock<T> {
  return { id: newBlockId(), type, data, order }
}

export function renumber(blocks: ExhibitionBlock[]): ExhibitionBlock[] {
  return blocks.map((b, i) => ({ ...b, order: i }))
}

/** 展览内全部文本长度（§12 限制用）。 */
export function exhibitionTextLength(ex: CuratedExhibition): number {
  let n = (ex.title?.length ?? 0) + (ex.subtitle?.length ?? 0) + (ex.intro?.length ?? 0)
  for (const b of ex.blocks) {
    const d = b.data as Record<string, unknown>
    for (const v of Object.values(d)) if (typeof v === 'string') n += v.length
  }
  return n
}
