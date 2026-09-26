import type { CuratedExhibition, ExhibitionBlock } from './curator/types'
import { curatorService } from './curator/curatorService'
import { phoneService } from './phoneService'
import type { Phone } from '@/data/types'

// ============================================================
// Public Exhibition（V0.9 规范 §4–§12 / §31 / §43–§44）：
// 分享链接打开的只读展览 —— 无需账号，任何人可浏览、
// SAVE TO MY MUSEUM（克隆为本地新展览）、继续探索博物馆。
// payload 只含引用，不复制 Phone 数据（§6）；坏引用降级不白屏（§35/§75）。
// ============================================================

/** 公开展览的分页模型：cover → blocks → end。 */
export interface PublicSlide {
  kind: 'cover' | 'block' | 'end'
  block?: ExhibitionBlock
  phone?: Phone
}

export interface PublicExhibition {
  id: string
  title: string
  subtitle?: string
  intro?: string
  coverPhone?: Phone
  slides: PublicSlide[]
}

/** 从分享 payload 构建分页模型；坏引用降级为 EXHIBIT UNAVAILABLE（§35）。 */
export async function buildPublicExhibition(ex: CuratedExhibition): Promise<PublicExhibition> {
  const coverPhone = ex.coverPhoneId ? await phoneService.getPhoneById(ex.coverPhoneId) : undefined
  const slides: PublicSlide[] = [{ kind: 'cover', phone: coverPhone }]
  for (const block of ex.blocks) {
    let phone: Phone | undefined
    if (block.type === 'exhibit' || block.type === 'image') {
      const d = block.data as { phoneId?: string }
      if (d.phoneId) phone = await phoneService.getPhoneById(d.phoneId)
    }
    slides.push({ kind: 'block', block, phone })
  }
  slides.push({ kind: 'end' })
  return {
    id: ex.id,
    title: ex.title,
    subtitle: ex.subtitle,
    intro: ex.intro,
    coverPhone,
    slides,
  }
}

/** SAVE TO MY MUSEUM（§8–§9）：克隆为新本地展览（新 id / 新 block id），不覆盖原展览。 */
export async function savePublicToMyMuseum(ex: CuratedExhibition): Promise<string | null> {
  const validBlocks: ExhibitionBlock[] = []
  for (const b of ex.blocks) {
    if (b.type === 'exhibit' || b.type === 'image') {
      const d = b.data as { phoneId?: string }
      if (d.phoneId && !(await phoneService.getPhoneById(d.phoneId))) continue // 坏引用跳过
    }
    validBlocks.push(b)
  }
  const created = curatorService.create(ex.title, 'shared')
  if (!created) return null
  curatorService.update(created.id, {
    subtitle: ex.subtitle,
    intro: ex.intro,
    coverPhoneId: ex.coverPhoneId,
    blocks: validBlocks,
  })
  return created.id
}
