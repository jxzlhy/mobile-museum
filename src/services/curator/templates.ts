import type { BlockType, ExhibitionBlock } from './types'
import { makeBlock } from './types'

// ============================================================
// Theme Templates（V0.8 规范 §21 / §63）：
// 模板只提供 Block 配置与 Phone IDs（引用），不复制 Phone 数据。
// ============================================================

export interface ExhibitionTemplate {
  id: string
  title: string
  titleZh: string
  subtitle?: string
  intro?: string
  theme: string
  coverPhoneId?: string
  blocks: Array<{ type: BlockType; data: Record<string, unknown> }>
}

function b(type: BlockType, data: Record<string, unknown>) {
  return { type, data }
}

export const exhibitionTemplates: ExhibitionTemplate[] = [
  {
    id: 'tpl-my-first-phones',
    title: 'MY FIRST PHONES',
    titleZh: '我的第一部手机',
    subtitle: '那些我真正想要过的机器',
    intro: '不是销量榜，而是欲望清单——每一台都曾让我停下来。',
    theme: 'personal',
    coverPhoneId: 'nokia-3310',
    blocks: [
      b('exhibit', { phoneId: 'nokia-3310', displayMode: 'photo' }),
      b('text', { text: '这是我最记得的一台——摔不坏，也换不完的颜色。' }),
      b('exhibit', { phoneId: 'motorola-razr-v3', displayMode: 'photo' }),
      b('exhibit', { phoneId: 'apple-iphone', displayMode: 'photo' }),
      b('comparison', { leftPhoneId: 'motorola-razr-v3', rightPhoneId: 'apple-iphone', label: '按键 → 触摸' }),
      b('exhibit', { phoneId: 'apple-iphone-4', displayMode: 'photo' }),
    ],
  },
  {
    id: 'tpl-phones-i-remember',
    title: 'THE PHONES I REMEMBER',
    titleZh: '我记得的手机',
    intro: '记忆不选最好的，只选最熟的。',
    theme: 'personal',
    blocks: [
      b('text', { text: '以下排序按记忆强度，不按年份。' }),
      b('exhibit', { phoneId: 'nokia-3210' }),
      b('exhibit', { phoneId: 'motorola-startac' }),
      b('exhibit', { phoneId: 'nokia-n95' }),
    ],
  },
  {
    id: 'tpl-from-buttons-to-touch',
    title: 'FROM BUTTONS TO TOUCH',
    titleZh: '从按键到触摸',
    intro: '界面如何从物理键，变成一整块玻璃。',
    theme: 'timeline',
    coverPhoneId: 'apple-iphone',
    blocks: [
      b('timeline', { mode: 'events', yearFrom: 1994, yearTo: 2017 }),
      b('exhibit', { phoneId: 'ibm-simon' }),
      b('exhibit', { phoneId: 'apple-iphone' }),
      b('comparison', { leftPhoneId: 'blackberry-bold-9000', rightPhoneId: 'apple-iphone', label: '键盘的尽头' }),
      b('exhibit', { phoneId: 'apple-iphone-x' }),
    ],
  },
  {
    id: 'tpl-design-of-mobile',
    title: 'THE DESIGN OF MOBILE',
    titleZh: '移动的设计',
    intro: '材质、厚度与开合——手记得一切。',
    theme: 'design',
    blocks: [
      b('exhibit', { phoneId: 'motorola-razr-v3', note: '金属第一次这么薄。' }),
      b('image', { phoneId: 'apple-iphone-4', angle: 'hero' }),
      b('exhibit', { phoneId: 'xiaomi-mi-mix' }),
      b('transition', { label: '折叠' }),
      b('exhibit', { phoneId: 'samsung-galaxy-fold' }),
    ],
  },
  {
    id: 'tpl-camera-phone',
    title: 'THE CAMERA PHONE',
    titleZh: '口袋里的眼睛',
    intro: '从 0.11 MP 的玩笑，到计算摄影。',
    theme: 'technology',
    blocks: [
      b('exhibit', { phoneId: 'sharp-j-sh04' }),
      b('timeline', { mode: 'events', yearFrom: 2000, yearTo: 2023 }),
      b('exhibit', { phoneId: 'nokia-n95' }),
      b('exhibit', { phoneId: 'huawei-p20-pro' }),
      b('exhibit', { phoneId: 'apple-iphone-15-pro' }),
    ],
  },
  {
    id: 'tpl-my-favorite-era',
    title: 'MY FAVORITE ERA',
    titleZh: '我最爱的年代',
    intro: '2007 年：两条路线在同一年登顶。',
    theme: 'era',
    coverPhoneId: 'apple-iphone',
    blocks: [
      b('time-machine', { year: 2007, sceneId: 'scene-2007' }),
      b('exhibit', { phoneId: 'apple-iphone' }),
      b('exhibit', { phoneId: 'nokia-n95' }),
      b('graph', { focusId: 'phone:apple-iphone' }),
    ],
  },
]

export function getTemplateById(id: string) {
  return exhibitionTemplates.find((t) => t.id === id)
}

/** 从模板实例化一个新展览的 blocks（重新分配 id）。 */
export function instantiateTemplate(template: ExhibitionTemplate): ExhibitionBlock[] {
  return template.blocks.map((t, i) => makeBlock(t.type, { ...t.data }, i))
}
