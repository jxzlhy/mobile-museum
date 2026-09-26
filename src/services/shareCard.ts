import { phoneService } from './phoneService'
import { resolvePhoneImage, assetSrc } from '@/data/assets'
import type { Phone } from '@/data/types'

// ============================================================
// Share Card（V0.9 规范 §17 / §56–§58）：1200 × 630 画布。
// 优先 approved 真实图（§58），无图用档案 fallback。
// 字体等待 document.fonts.ready（§57）；纯本地绘制，无 CORS 风险。
// ============================================================

export interface ShareCardOptions {
  title: string
  subtitle?: string
  coverPhoneId?: string
}

const W = 1200
const H = 630

async function loadCover(coverPhoneId?: string): Promise<{ img: HTMLImageElement; phone: Phone } | null> {
  if (!coverPhoneId) return null
  const phone = await phoneService.getPhoneById(coverPhoneId)
  const asset = phone ? resolvePhoneImage(phone, 'hero') : undefined
  if (!phone || !asset) return null
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ img, phone })
    img.onerror = () => resolve(null)
    img.src = assetSrc(asset)
  })
}

/** 生成 1200×630 分享卡 PNG Blob；失败返回 null（调用方降级为纯链接分享）。 */
export async function renderShareCard(opts: ShareCardOptions): Promise<Blob | null> {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // 字体就绪后再绘制（§57）
    try {
      await document.fonts.ready
    } catch {
      /* ignore */
    }

    // 黑色档案馆底
    ctx.fillStyle = '#080808'
    ctx.fillRect(0, 0, W, H)

    // 细线外框（博物馆视觉）
    ctx.strokeStyle = 'rgba(184, 178, 164, 0.55)'
    ctx.lineWidth = 3
    ctx.strokeRect(48, 48, W - 96, H - 96)

    // 右侧展品图（approved 真实图优先，§58）
    const cover = await loadCover(opts.coverPhoneId)
    if (cover) {
      const maxH = H - 200
      const scale = Math.min(maxH / cover.img.height, 480 / cover.img.width)
      const w = cover.img.width * scale
      const h = cover.img.height * scale
      ctx.drawImage(cover.img, W - 120 - w, (H - h) / 2, w, h)
      // 图注
      ctx.fillStyle = 'rgba(160, 160, 160, 0.9)'
      ctx.font = '300 22px "SF Mono", ui-monospace, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${cover.phone.releaseYear} · ${cover.phone.name}`, W - 120, H - 96)
    }

    // 左侧排版
    ctx.textAlign = 'left'
    ctx.fillStyle = '#b8b2a4'
    ctx.font = '500 24px "SF Mono", ui-monospace, monospace'
    ctx.fillText('M O B I L E   M U S E U M', 110, 140)

    ctx.fillStyle = '#f5f5f5'
    const title = opts.title
    ctx.font = '250 64px Inter, "PingFang SC", "Noto Sans SC", sans-serif'
    // 手动换行（每行约 12 个全角字符）
    const lines: string[] = []
    let cur = ''
    for (const ch of title) {
      if ([...cur].length >= 12) {
        lines.push(cur)
        cur = ch
      } else cur += ch
    }
    if (cur) lines.push(cur)
    lines.slice(0, 3).forEach((line, i) => ctx.fillText(line, 110, 260 + i * 84))

    if (opts.subtitle) {
      ctx.fillStyle = '#a0a0a0'
      ctx.font = '350 28px Inter, "PingFang SC", sans-serif'
      ctx.fillText(opts.subtitle.slice(0, 30), 110, 260 + Math.min(lines.length, 3) * 84 + 10)
    }

    ctx.fillStyle = '#606060'
    ctx.font = '400 20px "SF Mono", ui-monospace, monospace'
    ctx.fillText('CURATED WITH MOBILE MUSEUM', 110, H - 96)

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
  } catch {
    return null
  }
}

/** 优先 Web Share（带图），回退下载 PNG。 */
export async function shareCard(shareText: string, url: string, opts: ShareCardOptions): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await renderShareCard(opts)
  if (!blob) return 'failed'
  const nav = navigator as Navigator & {
    canShare?: (d: ShareData) => boolean
    share?: (d: ShareData) => Promise<void>
  }
  const file = new File([blob], 'mobile-museum-exhibition.png', { type: 'image/png' })
  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: shareText, url })
      return 'shared'
    } catch {
      /* 用户取消 → 下载 */
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'mobile-museum-exhibition.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  return 'downloaded'
}
