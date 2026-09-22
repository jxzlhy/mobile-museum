// ============================================================
// MOBILE MUSEUM — V0.2 数据模型（REAL COLLECTION，规范 §8）
// 真实图片 / 来源与授权元数据 / 展品分级是一级公民。
// ============================================================

export type FormFactor =
  | 'brick'
  | 'bar'
  | 'flip'
  | 'slider'
  | 'qwerty'
  | 'touch'
  | 'full-screen'
  | 'foldable'
  | 'pda'

export type MotionMode = 'standard' | 'immersive' | 'reduced'

// ---- 展品分级（规范 §7）----
export type ExhibitLevel = 1 | 2 | 3

// ---- 资产状态机（V0.2.5 §5）：只有 approved 才会进入前端资源 ----
export type AssetStatus = 'missing' | 'candidate' | 'verified' | 'approved' | 'rejected'

export type AssetAngle = 'hero' | 'front' | 'back' | 'side' | 'detail'

export interface PhoneImageAssetSource {
  type: 'official' | 'wikidata' | 'wikimedia-commons' | 'licensed' | 'self-created'
  url?: string
  title?: string
  author?: string
  license?: string
  licenseUrl?: string
  attribution?: string
}

export interface PhoneImageAsset {
  path: string
  thumbPath?: string
  status: AssetStatus
  source?: PhoneImageAssetSource
  width?: number
  height?: number
  format?: 'webp' | 'avif' | 'jpg' | 'png'
  alt?: string
}

/** 按角度组织的资产集合（V0.2.5 §4）。 */
export interface PhoneAssets {
  hero?: PhoneImageAsset
  front?: PhoneImageAsset
  back?: PhoneImageAsset
  side?: PhoneImageAsset
  detail?: PhoneImageAsset
  gallery?: PhoneImageAsset[]
}

export interface PhoneImageSource {
  provider: 'wikimedia-commons' | 'official' | 'licensed' | 'self-created'
  sourceUrl?: string
  author?: string
  license?: string
  licenseUrl?: string
  attribution?: string
}

export interface PhoneSource {
  provider: 'wikidata' | 'wikimedia' | 'official' | 'licensed' | 'custom' | 'original' | 'other'
  url?: string
  title?: string
  author?: string
  license?: string
  licenseUrl?: string
  note?: string
}

export interface PhoneModel3D {
  url: string
  poster?: string
  format: 'glb'
  source?: {
    provider: 'custom' | 'licensed' | 'official'
    sourceUrl?: string
    author?: string
    license?: string
    licenseUrl?: string
  }
}

export interface PhoneSpecs {
  dimensions?: string
  weight?: number
  display?: string
  displaySize?: number
  camera?: string
  cameraFront?: string
  battery?: string
  network?: string[]
  operatingSystem?: string
  processor?: string
  storage?: string[]
}

export interface Phone {
  id: string
  /** 固定展品编号（如 MM-001），按年代顺序在数据装配时分配（规范 §49）。 */
  exhibitNo?: string
  name: string
  modelName?: string
  brandId: string
  /** 品牌显示名（简体中文优先）。 */
  brandName: string
  /** 品牌拉丁名，小字辅助显示。 */
  brandEn?: string

  releaseDate?: string
  releaseYear: number
  /** 年代 id，如 "1970s"。 */
  eraId?: string
  formFactor?: FormFactor

  /** 一句话导言（展签口吻）。 */
  tagline?: string

  /** 按角度组织的真实图片资产（V0.2.5 §4；只有 approved 会被前端读取）。 */
  assets?: PhoneAssets
  /** 原创程序化 3D 模型 id（procedural:*），自有版权资产。 */
  model?: string
  /** 外部 GLB 资产（V0.3 预留，规范 §8）。 */
  model3d?: PhoneModel3D

  specs?: PhoneSpecs

  story?: string
  significance?: string
  impact?: string

  technologies?: string[]
  tags?: string[]

  predecessorIds?: string[]
  successorIds?: string[]
  relatedPhoneIds?: string[]

  exhibitLevel: ExhibitLevel
  featured?: boolean
  treasure?: boolean

  /** 内容与资产的来源声明（规范 §63 / §68 / §107）。 */
  sources: PhoneSource[]
}

// ---- 策展输入形态（phones.ts 的紧凑书写格式，由 normalize.ts 归一化为 Phone）----

export interface PhoneSeed {
  id: string
  name: string
  brandId: string
  brand: string
  brandEn?: string
  releaseDate?: string
  releaseYear: number
  formFactor?: FormFactor
  tagline?: string
  weight?: number
  dimensions?: { width?: number; height?: number; depth?: number }
  display?: { size?: number; type?: string; resolution?: string }
  camera?: { rear?: string; front?: string }
  network?: string[]
  battery?: string
  operatingSystem?: string
  technologies?: string[]
  story?: string
  significance?: string
  impact?: string
  predecessors?: string[]
  successors?: string[]
  relatedPhones?: string[]
  featured?: boolean
  treasure?: boolean
  /** 原创程序化 3D 模型 id（procedural:*）。 */
  model?: string
  assetMeta?: { source?: string; license?: string }
}

// ---- 品牌馆 ----

export interface BrandHighlight {
  label: string
  value: string
}

export interface BrandTimelineEvent {
  year: number
  label: string
  description?: string
}

export interface Brand {
  id: string
  name: string
  nameEn?: string
  foundedYear?: number
  country?: string
  description?: string
  motto?: string
  logo?: string
  heroImage?: string
  featuredPhones?: string[]
  timeline?: BrandTimelineEvent[]
  story?: string
  highlights?: BrandHighlight[]
  status?: string
  sources?: string[]
}

// ---- 技术馆 ----

export type TechnologyCategory =
  | 'display'
  | 'camera'
  | 'network'
  | 'processor'
  | 'battery'
  | 'form-factor'

export interface TechnologyMilestone {
  year: number
  label: string
  description?: string
}

export interface Technology {
  id: string
  name: string
  category: TechnologyCategory
  startYear?: number
  description?: string
  milestones?: TechnologyMilestone[]
}

// ---- 时间线事件 ----

export interface HistoricalEvent {
  id: string
  year: number
  title: string
  description: string
  relatedPhones?: string[]
  relatedBrands?: string[]
  importance?: 'low' | 'medium' | 'high'
}

// ---- 形态馆 ----

export interface FormFactorInfo {
  id: FormFactor
  label: string
  en: string
  years: string
  modelId: string
  description: string
}

// ---- 个人收藏（规范 §44）----

export interface CollectionItem {
  phoneId: string
  /** 加入时间（epoch 毫秒）。 */
  addedAt: number
  order: number
}

// ---- 博物馆护照（V0.4 规范 §38）----

export interface MuseumDiscovery {
  phoneId: string
  discoveredAt: number
  /** 触发来源：查看详情 / 展厅展签 / 珍藏展厅。 */
  source?: 'view' | 'hall' | 'treasure'
}
