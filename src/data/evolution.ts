import { phones } from './phones'
import type { FormFactor, Phone } from './types'

// EVOLUTION 数据（V0.3 §9–§11）：从单一 Phone 数据源派生的
// 12 个代表节点（不复制数据，规范 §58/§59）。

export interface EvolutionMetrics {
  weight?: number
  thickness?: number
  displaySize?: number
  cameraMP?: number
}

export interface EvolutionPoint {
  year: number
  phoneId: string
  phone: Phone
  metrics: EvolutionMetrics
  formFactor?: FormFactor
}

/** 从 dimensions 字符串 "61 × 115 × 11.6 毫米" 解析厚度。 */
function parseThickness(dimensions?: string): number | undefined {
  if (!dimensions) return undefined
  const parts = dimensions.split('×').map((s) => parseFloat(s))
  return Number.isFinite(parts[2]) ? parts[2] : undefined
}

/** 从相机描述解析主摄像素数（近似值，仅用于可视化比例）。 */
function parseCameraMP(camera?: string): number | undefined {
  if (!camera) return undefined
  const m = camera.match(/(\d+(?:\.\d+)?)\s*(?:MP|百万)/i)
  if (m) return parseFloat(m[1])
  const wan = camera.match(/(\d+(?:\.\d+)?)\s*万/)
  if (wan) return parseFloat(wan[1]) / 100 // 1200 万 ≈ 12 MP 量级
  return undefined
}

function metricsOf(phone: Phone): EvolutionMetrics {
  return {
    weight: phone.specs?.weight,
    thickness: parseThickness(phone.specs?.dimensions),
    displaySize: phone.specs?.displaySize,
    cameraMP: parseCameraMP(phone.specs?.camera),
  }
}

const MILESTONE_IDS = [
  'motorola-dynatac-prototype', // 1973 起点
  'motorola-dynatac-8000x', // 1983 商品化
  'ibm-simon', // 1994 第一部智能手机
  'nokia-9000-communicator', // 1996 键盘办公
  'nokia-3210', // 1999 大众化
  'motorola-razr-v3', // 2004 极限纤薄
  'apple-iphone', // 2007 触摸革命
  'htc-dream', // 2008 Android
  'apple-iphone-4', // 2010 视网膜
  'apple-iphone-x', // 2017 全面屏
  'samsung-galaxy-fold', // 2019 折叠
  'apple-iphone-15-pro', // 2023 钛与 AI
]

/** 演化长卷的代表节点（按年份升序）。 */
export const evolutionPoints: EvolutionPoint[] = MILESTONE_IDS.map((id): EvolutionPoint | null => {
  const phone = phones.find((p) => p.id === id)
  if (!phone) return null
  return {
    year: phone.releaseYear,
    phoneId: phone.id,
    phone,
    metrics: metricsOf(phone),
    formFactor: phone.formFactor,
  }
}).filter((p): p is EvolutionPoint => p !== null)

export function getEvolutionPoints(): EvolutionPoint[] {
  return evolutionPoints
}

/** 给定年份，返回当前应展示的节点（≤year 的最近一个）。 */
export function pointForYear(year: number): EvolutionPoint {
  let active = evolutionPoints[0]
  for (const p of evolutionPoints) {
    if (p.year <= year) active = p
  }
  return active
}

export const EVOLUTION_RANGE = { min: 1973, max: 2026 }
