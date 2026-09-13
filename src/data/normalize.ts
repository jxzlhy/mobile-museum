import type { ExhibitLevel, Phone, PhoneSeed, PhoneSource, PhoneSpecs } from './types'
import { getPhoneAssets } from './assets'

// 归一化层：PhoneSeed（策展书写格式）→ Phone（规范 §8 模型）。
// 图片来自 phoneAssets 人工策展清单；来源声明在此统一装配。

export function eraOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`
}

function levelOf(seed: PhoneSeed): ExhibitLevel {
  if (seed.treasure) return 3
  if (seed.featured) return 2
  return 1
}

function specsOf(seed: PhoneSeed): PhoneSpecs {
  const d = seed.dimensions
  return {
    dimensions: d?.height ? `${d.width ?? '?'} × ${d.height} × ${d.depth ?? '?'} 毫米` : undefined,
    weight: seed.weight,
    display: seed.display?.type,
    displaySize: seed.display?.size,
    camera: seed.camera?.rear,
    cameraFront: seed.camera?.front,
    battery: seed.battery,
    network: seed.network,
    operatingSystem: seed.operatingSystem,
  }
}

function sourcesOf(seed: PhoneSeed): PhoneSource[] {
  const sources: PhoneSource[] = [
    {
      provider: 'original',
      title: '藏品文字',
      note: '博物馆依据公开史料编写的原创综述；销量与份额为公开报道约数。',
    },
  ]
  if (seed.model) {
    sources.push({
      provider: 'custom',
      title: '3D 展品',
      note: '原创程序化模型，自有版权（非扫描、非第三方资产）。',
    })
  }
  return sources
}

export function normalizePhone(seed: PhoneSeed): Phone {
  const assets = getPhoneAssets(seed.id)
  return {
    id: seed.id,
    name: seed.name,
    brandId: seed.brandId,
    brandName: seed.brand,
    brandEn: seed.brandEn,
    releaseDate: seed.releaseDate,
    releaseYear: seed.releaseYear,
    eraId: eraOf(seed.releaseYear),
    formFactor: seed.formFactor,
    tagline: seed.tagline,
    assets,
    model: seed.model,
    specs: specsOf(seed),
    story: seed.story,
    significance: seed.significance,
    impact: seed.impact,
    technologies: seed.technologies,
    tags: [
      ...(seed.formFactor ? [seed.formFactor] : []),
      eraOf(seed.releaseYear),
      ...(seed.technologies ?? []),
    ],
    predecessorIds: seed.predecessors ?? [],
    successorIds: seed.successors ?? [],
    relatedPhoneIds: seed.relatedPhones ?? [],
    exhibitLevel: levelOf(seed),
    featured: seed.featured,
    treasure: seed.treasure,
    model3d: undefined,
    sources: sourcesOf(seed),
  }
}
