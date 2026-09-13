import type { FormFactor } from './types'

// 形态馆（Form Factor Museum, 规范 §34 / §111）— 每种形态一节展位，
// 对应一个程序化 3D 模型。

export interface FormFactorInfo {
  id: FormFactor
  label: string
  en: string
  years: string
  modelId: string
  description: string
}

export const formFactors: FormFactorInfo[] = [
  {
    id: 'brick',
    label: '砖块',
    en: 'BRICK',
    years: '1983 — 1990s',
    modelId: 'procedural:dynatac',
    description:
      '移动电话最诚实的形态：一块能打电话的砖。巨大、昂贵、按一下响一声——但它是此后一切形态的祖先。',
  },
  {
    id: 'bar',
    label: '直板',
    en: 'BAR',
    years: '1990s — 2000s',
    modelId: 'procedural:bar',
    description:
      '屏幕在上、键盘在下的经典排布。没有活动部件、皮实耐用——直板功能机把手机带进了全世界的口袋。',
  },
  {
    id: 'flip',
    label: '翻盖',
    en: 'FLIP',
    years: '1989 — 2009 · 2019 —',
    modelId: 'procedural:flip',
    description:
      '翻开接听，合上消失。翻盖把"挂断"变成一个动作，把手机变成一个随身秘密。十五年后它以柔性屏之名复活。',
  },
  {
    id: 'slider',
    label: '滑盖',
    en: 'SLIDER',
    years: '2000s',
    modelId: 'procedural:slider',
    description:
      '推开上盖露出键盘的那一声"咔哒"，是功能机时代最性感的机械音。滑盖把大屏与小机身合进了同一部手机。',
  },
  {
    id: 'qwerty',
    label: '全键盘',
    en: 'QWERTY',
    years: '1996 — 2010s',
    modelId: 'procedural:qwerty',
    description:
      '为拇指而生的一整副键盘。黑莓用它在董事会上统治了一个年代——直到触摸屏教会了我们滑动输入。',
  },
  {
    id: 'full-screen',
    label: '全面屏',
    en: 'FULL SCREEN',
    years: '2016 —',
    modelId: 'procedural:slab',
    description:
      '边框退场，屏幕即手机。从 MIX 的三边极窄到 iPhone X 的刘海，一整块玻璃成为十年不破的标准答案。',
  },
  {
    id: 'foldable',
    label: '折叠屏',
    en: 'FOLDABLE',
    years: '2019 —',
    modelId: 'procedural:foldable',
    description:
      '板砖弯折，口袋展开成平板。铰链与柔性玻璃让"大小兼得"第一次成为字面意义——形态的边疆仍在扩张。',
  },
]

export function formFactorLabel(id: FormFactor | undefined | null): string {
  if (!id) return '展品'
  if (id === 'pda') return '掌上电脑'
  if (id === 'touch') return '触屏直板'
  return formFactors.find((f) => f.id === id)?.label ?? id
}

export function formFactorEn(id: FormFactor | undefined | null): string {
  if (!id) return 'EXHIBIT'
  if (id === 'pda') return 'PDA'
  if (id === 'touch') return 'TOUCH'
  return formFactors.find((f) => f.id === id)?.en ?? id.toUpperCase()
}

export function formFactorModel(id: FormFactor | undefined | null): string | null {
  if (!id) return null
  return formFactors.find((f) => f.id === id)?.modelId ?? null
}
