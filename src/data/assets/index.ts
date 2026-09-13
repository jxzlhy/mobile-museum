import manifest from './assets-manifest.json'
import type { AssetAngle, Phone, PhoneAssets, PhoneImageAsset } from '../types'

// ============================================================
// 统一 Image Resolver（V0.2.5 §14）
// ------------------------------------------------------------
// 所有页面（Timeline / Brand / Search / Collection / Phone Detail）
// 一律通过这里读取真实图片：
//   resolvePhoneImage(phone, 'hero')  → approved 资产或 undefined
//   phoneImageList(phone)             → approved 资产的有序列表（图库用）
// 没有 approved 真实图 → 返回 undefined，调用方走 archive / line-art
// fallback（规范 §22：fallback 代表「暂无经验证的真实影像资料」）。
// ============================================================

const ANGLE_ORDER: AssetAngle[] = ['hero', 'front', 'back', 'side', 'detail']

interface ManifestShape {
  phones: Record<string, PhoneAssets>
}

const data = manifest as ManifestShape

export function getPhoneAssets(phoneId: string): PhoneAssets | undefined {
  return data.phones[phoneId]
}

/** 取某个角度的 approved 资产；非 approved 一律不外借（规范 §7）。 */
export function resolvePhoneImage(
  phone: Pick<Phone, 'id'>,
  angle: AssetAngle = 'hero',
): PhoneImageAsset | undefined {
  const asset = getPhoneAssets(phone.id)?.[angle]
  return asset?.status === 'approved' ? asset : undefined
}

/** 图库用：approved 资产的有序扁平列表（hero → front → back → side → detail → gallery）。 */
export function phoneImageList(phone: Pick<Phone, 'id'>): Array<PhoneImageAsset & { angle: string }> {
  const assets = getPhoneAssets(phone.id)
  if (!assets) return []
  const out: Array<PhoneImageAsset & { angle: string }> = []
  for (const angle of ANGLE_ORDER) {
    const a = assets[angle]
    if (a?.status === 'approved') out.push({ ...a, angle })
  }
  for (const a of assets.gallery ?? []) {
    if (a.status === 'approved') out.push({ ...a, angle: 'gallery' })
  }
  return out
}

/** 缩略地址：优先 thumbPath，回退原图。 */
export function assetSrc(asset: PhoneImageAsset, thumb = false): string {
  return (thumb ? asset.thumbPath : undefined) ?? asset.path
}

/** 展示用标签（图库 tabs / alt 文案）。 */
export const ANGLE_LABELS: Record<string, string> = {
  hero: '主图',
  front: '正面',
  back: '背面',
  side: '侧面',
  detail: '细节',
  gallery: '图集',
}
