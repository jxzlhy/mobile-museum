import { phoneService } from './phoneService'
import { exhibitContents, type AudioGuide, type ExhibitContent } from '@/data/exhibits'
import { resolvePhoneImage, phoneImageList } from '@/data/assets'
import type { Phone } from '@/data/types'

// ============================================================
// Exhibit Service（V0.5 规范 §29–§31 / §54）：
// 展品能力解析器 —— UI 由 capability 驱动，不存在的入口不显示。
// 能力分层（§31）：Level 3 全量 / Level 2 照片+3D / Level 1 照片。
// ============================================================

export interface ExhibitCapabilities {
  realPhoto: boolean
  gallery: boolean
  model3d: boolean
  structure: boolean
  material: boolean
  audio: boolean
  detail: boolean
}

export interface Exhibit {
  phone: Phone
  content: ExhibitContent | null
  capabilities: ExhibitCapabilities
}

export const exhibitService = {
  /** 能力解析（§29）：全部基于真实数据计算，不做假入口。 */
  async getCapabilities(phoneId: string): Promise<ExhibitCapabilities> {
    const [phone] = await Promise.all([phoneService.getPhoneById(phoneId)])
    const content = exhibitContents[phoneId]
    const galleryImages = phone ? phoneImageList(phone) : []
    return {
      realPhoto: Boolean(phone && resolvePhoneImage(phone, 'hero')),
      gallery: galleryImages.length > 1,
      model3d: Boolean(phone?.model),
      structure: Boolean(content?.parts.length && phone?.model),
      material: Boolean(content?.materials.length),
      audio: Boolean(content?.audio),
      detail: Boolean(content?.details.length),
    }
  },

  async getExhibit(phoneId: string): Promise<Exhibit | undefined> {
    const phone = await phoneService.getPhoneById(phoneId)
    if (!phone) return undefined
    const content = exhibitContents[phoneId] ?? null
    const capabilities = await this.getCapabilities(phoneId)
    return { phone, content, capabilities }
  },

  async getStructure(phoneId: string) {
    return exhibitContents[phoneId]?.parts ?? null
  },

  async getMaterials(phoneId: string) {
    return exhibitContents[phoneId]?.materials ?? []
  },

  async getDetails(phoneId: string) {
    return exhibitContents[phoneId]?.details ?? []
  },

  async getAudioGuide(phoneId: string): Promise<AudioGuide | undefined> {
    return exhibitContents[phoneId]?.audio
  },
}
