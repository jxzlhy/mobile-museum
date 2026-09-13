import { phones } from '@/data/phones'
import type { Phone } from '@/data/types'

// Comparison Service（V0.3 §33–§36）：
// 统一处理单位归一 / 缺失数据 / 视觉比例 / WHAT CHANGED 解释层。

export type ComparisonVisual = 'bar' | 'number' | 'timeline' | 'category'

export interface ComparisonMetric {
  key: string
  label: string
  leftValue?: number | string
  rightValue?: number | string
  unit?: string
  visualType: ComparisonVisual
  /** bar 归一化基数（两值较大者）。 */
  max?: number
  /** WHAT CHANGED 解释句（数据充分时）。 */
  change?: string
}

export interface ComparisonResult {
  left: Phone
  right: Phone
  metrics: ComparisonMetric[]
  yearsApart: number
  summary: string[]
}

const NOT_DOCUMENTED = '未记载'

function thicknessOf(p: Phone): number | undefined {
  const d = p.specs?.dimensions
  if (!d) return undefined
  const v = parseFloat(d.split('×')[2])
  return Number.isFinite(v) ? v : undefined
}

function cameraOf(p: Phone): string | undefined {
  return p.specs?.camera
}

function fmt(n: number | string | undefined, unit?: string): string {
  if (n === undefined) return NOT_DOCUMENTED
  return `${n}${unit ? ' ' + unit : ''}`
}

export const comparisonService = {
  comparePhones(a: Phone, b: Phone): ComparisonResult {
    const metrics: ComparisonMetric[] = []

    // 年份 —— 时间轴
    metrics.push({
      key: 'year',
      label: '发布年份',
      leftValue: a.releaseYear,
      rightValue: b.releaseYear,
      visualType: 'timeline',
    })

    // 重量（克）
    const wa = a.specs?.weight
    const wb = b.specs?.weight
    if (wa !== undefined || wb !== undefined) {
      const max = Math.max(wa ?? 0, wb ?? 0)
      metrics.push({
        key: 'weight',
        label: '重量',
        leftValue: wa,
        rightValue: wb,
        unit: '克',
        visualType: 'bar',
        max,
        change:
          wa !== undefined && wb !== undefined && wa !== wb
            ? wa > wb
              ? `机身轻了——从 ${wa} 克到 ${wb} 克。`
              : `机身重了——屏幕和结构换来了 ${wb} 克。`
            : undefined,
      })
    }

    // 厚度（毫米）
    const ta = thicknessOf(a)
    const tb = thicknessOf(b)
    if (ta !== undefined || tb !== undefined) {
      const max = Math.max(ta ?? 0, tb ?? 0)
      metrics.push({
        key: 'thickness',
        label: '厚度',
        leftValue: ta,
        rightValue: tb,
        unit: '毫米',
        visualType: 'bar',
        max,
        change:
          ta !== undefined && tb !== undefined && ta !== tb
            ? ta > tb
              ? `薄了 ${Math.round((ta - tb) * 10) / 10} 毫米。`
              : `厚了 ${Math.round((tb - ta) * 10) / 10} 毫米——为更大的屏幕与电池。`
            : undefined,
      })
    }

    // 屏幕尺寸（英寸）
    const da = a.specs?.displaySize
    const db = b.specs?.displaySize
    if (da !== undefined || db !== undefined) {
      const max = Math.max(da ?? 0, db ?? 0)
      metrics.push({
        key: 'display',
        label: '屏幕',
        leftValue: da,
        rightValue: db,
        unit: '英寸',
        visualType: 'bar',
        max,
        change:
          da !== undefined && db !== undefined && da !== db
            ? `屏幕从 ${da}" 长到了 ${db}"。`
            : undefined,
      })
    }

    // 相机（描述文字）
    const ca = cameraOf(a)
    const cb = cameraOf(b)
    if (ca || cb) {
      metrics.push({
        key: 'camera',
        label: '相机',
        leftValue: ca ?? NOT_DOCUMENTED,
        rightValue: cb ?? NOT_DOCUMENTED,
        visualType: 'number',
        change:
          ca && cb && ca !== cb
            ? '相机的进化从来不只在一维：更多镜头、更大的传感器、更强的算法。'
            : undefined,
      })
    }

    // 网络（类别）
    const na = a.specs?.network?.join(' · ')
    const nb = b.specs?.network?.join(' · ')
    if (na || nb) {
      metrics.push({
        key: 'network',
        label: '网络',
        leftValue: na ?? NOT_DOCUMENTED,
        rightValue: nb ?? NOT_DOCUMENTED,
        visualType: 'category',
      })
    }

    // 形态（类别）
    const fa = a.formFactor ? a.formFactor : undefined
    const fb = b.formFactor ? b.formFactor : undefined
    metrics.push({
      key: 'form',
      label: '形态',
      leftValue: fa ?? NOT_DOCUMENTED,
      rightValue: fb ?? NOT_DOCUMENTED,
      visualType: 'category',
      change: fa && fb && fa !== fb ? `形态从「${fa}」变成了「${fb}」。` : undefined,
    })

    const yearsApart = Math.abs(a.releaseYear - b.releaseYear)

    // WHAT CHANGED 解释层（§32）
    const summary: string[] = []
    const changes = metrics.map((m) => m.change).filter(Boolean) as string[]
    summary.push(
      yearsApart > 0
        ? `${yearsApart} 年的变化，浓缩在两台设备之间。`
        : '两台同时代的设备。',
    )
    summary.push(...changes.slice(0, 4))

    return { left: a, right: b, metrics, yearsApart, summary }
  },

  async getPresets(): Promise<Array<{ label: string; left: string; right: string }>> {
    const all = await (await import('./phoneService')).phoneService.getPhones()
    const pick = (preferred: string[], fallbackBrand?: string): Phone => {
      for (const id of preferred) {
        const p = all.find((x) => x.id === id)
        if (p) return p
      }
      return fallbackBrand ? all.find((x) => x.brandId === fallbackBrand) ?? all[0] : all[0]
    }
    return [
      { label: 'DynaTAC vs iPhone', left: pick(['motorola-dynatac-8000x']).id, right: pick(['apple-iphone']).id },
      { label: 'Nokia 3310 vs iPhone', left: pick(['nokia-3310']).id, right: pick(['apple-iphone']).id },
      { label: 'iPhone 2007 vs iPhone 15 Pro', left: pick(['apple-iphone']).id, right: pick(['apple-iphone-15-pro']).id },
      { label: 'RAZR V3 vs Galaxy Fold', left: pick(['motorola-razr-v3']).id, right: pick(['samsung-galaxy-fold']).id },
      { label: 'iPhone 4 vs iPhone X', left: pick(['apple-iphone-4']).id, right: pick(['apple-iphone-x']).id },
    ]
  },
}
