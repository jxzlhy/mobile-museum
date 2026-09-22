import type { Phone } from '../types'

// ============================================================
// V0.7 TIME MACHINE 数据（规范 §12–§27 / §89 / §90 / §104）：
// 历史场景 = 数字展览式重构（§9）：Hero 手机 + 相关设备 +
// 技术标记 + 时代版式 + 环境光 + 档案文本。所有对象必须来自
// 已有数据（§15），不虚构「那个时代应该有的东西」。
// 场景精度三级（§16）：documented / curated / abstract，UI 可区分。
// 策展者（§89）：MOBILE MUSEUM。
// ============================================================

export type SceneAccuracy = 'documented' | 'curated' | 'abstract'

export interface HistoricalSceneObject {
  id: string
  type: 'phone' | 'device' | 'technology' | 'event' | 'text'
  refId?: string
  position?: { x: number; y: number; z: number }
  scale?: number
  rotation?: { x: number; y: number; z: number }
}

export interface SceneChapter {
  title: string
  /** 20–80 字（规范 §91）。 */
  text: string
  phoneIds?: string[]
  technologyId?: string
}

export interface HistoricalScene {
  id: string
  year: number
  title: string
  titleZh: string
  subtitle?: string
  /** 40–100 字（规范 §91）。 */
  description?: string
  featuredPhoneIds: string[]
  technologyIds?: string[]
  brandIds?: string[]
  eventIds?: string[]
  storyIds?: string[]
  contextId?: string
  sourceIds?: string[]
  sceneType: SceneAccuracy
  objects: HistoricalSceneObject[]
  chapters: SceneChapter[]
  /** WHAT CHANGED?（§43）：一句话总结。 */
  whatChanged: string
  /** 环境光方向（§61）：仅视觉方向，不代表历史事实。 */
  lightMood: 'industrial-warm' | 'neutral-commercial' | 'clean-digital' | 'minimal-reflective'
  curatedBy: string
}

/** Technology Moment（规范 §25）：某项技术发生时的 before / change / after。 */
export interface TechnologyMoment {
  technologyId: string
  year: number
  before?: string
  change: string
  after?: string
  phoneIds?: string[]
  storyIds?: string[]
  sourceIds?: string[]
}

/** Culture Layer（规范 §27）：只收录有资料支撑的文化现象。 */
export interface CultureNode {
  id: string
  title: string
  year?: number
  description?: string
  relatedPhoneIds?: string[]
  relatedTechnologyIds?: string[]
  sourceIds?: string[]
}

// ---- 六个首批历史场景（规范 §104）----

export const historicalScenes: HistoricalScene[] = [
  {
    id: 'scene-1973',
    year: 1973,
    title: 'FIRST MOBILE CALL',
    titleZh: '第一通手持电话',
    subtitle: '电话第一次离开墙',
    description: '1973 年 4 月 3 日，马丁·库帕在纽约街头拨出史上第一通手持电话。它还不能卖给任何人，但方向已经确定。',
    featuredPhoneIds: ['motorola-dynatac-prototype'],
    technologyIds: ['network'],
    brandIds: ['motorola'],
    eventIds: ['first-handheld-call'],
    storyIds: ['the-first-mobile-phone'],
    contextId: '1973',
    sourceIds: ['src-curation'],
    sceneType: 'documented',
    lightMood: 'industrial-warm',
    curatedBy: 'MOBILE MUSEUM',
    objects: [
      { id: 'hero', type: 'phone', refId: 'motorola-dynatac-prototype', position: { x: 0, y: 0.9, z: 0 }, scale: 1.15 },
      { id: 'net-1g', type: 'technology', refId: 'network', position: { x: -1.9, y: 1.5, z: -1.2 }, scale: 0.8 },
      { id: 'text-milestone', type: 'text', refId: 'first-handheld-call', position: { x: 1.9, y: 1.6, z: -1.4 }, scale: 1 },
    ],
    chapters: [
      { title: 'THE CALL', text: '十个月的研制，一次公开通话——电话从此可以跟着人走。', phoneIds: ['motorola-dynatac-prototype'] },
      { title: 'THE MACHINE', text: '原型机重逾一公斤，只能拨号与通话，没有任何屏幕可言。', phoneIds: ['motorola-dynatac-prototype'] },
      { title: 'THE DECADE', text: '从演示到开售，中间隔着一亿美元与十年工程。', phoneIds: ['motorola-dynatac-8000x'] },
    ],
    whatChanged: '电话第一次属于个人，而不是属于一个地方。',
  },
  {
    id: 'scene-1983',
    year: 1983,
    title: 'COMMERCIAL MOBILE PHONE',
    titleZh: '砖头开售',
    subtitle: '移动电话成为商品',
    description: 'DynaTAC 8000X 以 3,995 美元上架：通话三十分钟，充电十小时。「砖头」从此既是调侃，也是图腾。',
    featuredPhoneIds: ['motorola-dynatac-8000x', 'motorola-microtac'],
    technologyIds: ['network', 'battery'],
    brandIds: ['motorola'],
    eventIds: ['dynatac-goes-on-sale'],
    storyIds: ['the-first-mobile-phone'],
    contextId: '1983',
    sourceIds: ['src-curation'],
    sceneType: 'documented',
    lightMood: 'industrial-warm',
    curatedBy: 'MOBILE MUSEUM',
    objects: [
      { id: 'hero', type: 'phone', refId: 'motorola-dynatac-8000x', position: { x: 0, y: 0.9, z: 0 }, scale: 1.15 },
      { id: 'rel-microtac', type: 'phone', refId: 'motorola-microtac', position: { x: 2.1, y: 0.7, z: -1.6 }, scale: 0.95 },
      { id: 'net-1g', type: 'technology', refId: 'network', position: { x: -1.9, y: 1.5, z: -1.2 }, scale: 0.8 },
    ],
    chapters: [
      { title: 'THE PRICE', text: '一辆轿车的价钱，换来随时随地的通话。', phoneIds: ['motorola-dynatac-8000x'] },
      { title: 'THE BATTERY', text: '镍镉电池：充电十小时，通话三十分钟。', phoneIds: ['motorola-dynatac-8000x'], technologyId: 'battery' },
      { title: 'THE NEXT STEP', text: '1989 年 MicroTAC 把话筒折进机身，便携成为主旋律。', phoneIds: ['motorola-microtac'] },
    ],
    whatChanged: '消费级移动通信市场自此开局。',
  },
  {
    id: 'scene-1999',
    year: 1999,
    title: 'FEATURE PHONE ERA',
    titleZh: '功能机时代',
    subtitle: '手机成为日用品',
    description: '1.6 亿部的 3210、可换彩壳、连锁短信与贪吃蛇——1999 年前后，手机第一次成为大众文化的舞台。',
    featuredPhoneIds: ['nokia-3210', 'nokia-3310', 'nokia-8110'],
    technologyIds: ['network', 'display'],
    brandIds: ['nokia'],
    storyIds: ['the-rise-of-nokia'],
    contextId: '1999',
    sourceIds: ['src-curation'],
    sceneType: 'documented',
    lightMood: 'neutral-commercial',
    curatedBy: 'MOBILE MUSEUM',
    objects: [
      { id: 'hero', type: 'phone', refId: 'nokia-3210', position: { x: 0, y: 0.9, z: 0 }, scale: 1.1 },
      { id: 'rel-3310', type: 'phone', refId: 'nokia-3310', position: { x: -2.0, y: 0.7, z: -1.4 }, scale: 0.95 },
      { id: 'rel-8110', type: 'phone', refId: 'nokia-8110', position: { x: 2.1, y: 0.7, z: -1.8 }, scale: 0.9 },
      { id: 'net-2g', type: 'technology', refId: 'network', position: { x: 1.6, y: 1.7, z: -2.2 }, scale: 0.8 },
    ],
    chapters: [
      { title: 'THE MASS', text: '3210 卖出 1.6 亿部——手机第一次以亿为单位计算。', phoneIds: ['nokia-3210'] },
      { title: 'THE COVER', text: 'Xpress-on 可换彩壳，把手机变成个人表达。', phoneIds: ['nokia-3310'] },
      { title: 'THE NETWORK', text: 'GSM 短信成为日常，数字蜂窝完成普及。', technologyId: 'network' },
    ],
    whatChanged: '手机从商务工具变成每个人的日用品。',
  },
  {
    id: 'scene-2007',
    year: 2007,
    title: 'TOUCHSCREEN REVOLUTION',
    titleZh: '触摸革命',
    subtitle: '屏幕成为整台手机',
    description: 'iPhone 与 N95 同年：功能机的顶点与智能机的起点正面相遇。电容多点触控让键盘开始退场。',
    featuredPhoneIds: ['apple-iphone', 'nokia-n95'],
    technologyIds: ['display', 'camera'],
    brandIds: ['apple', 'nokia'],
    storyIds: ['the-touchscreen-revolution', 'the-camera-phone'],
    contextId: '2007',
    sourceIds: ['src-curation'],
    sceneType: 'documented',
    lightMood: 'clean-digital',
    curatedBy: 'MOBILE MUSEUM',
    objects: [
      { id: 'hero', type: 'phone', refId: 'apple-iphone', position: { x: 0, y: 0.9, z: 0 }, scale: 1.1 },
      { id: 'rel-n95', type: 'phone', refId: 'nokia-n95', position: { x: -2.0, y: 0.7, z: -1.5 }, scale: 0.95 },
      { id: 'tech-multitouch', type: 'technology', refId: 'display', position: { x: 1.9, y: 1.6, z: -1.3 }, scale: 0.85 },
      { id: 'tech-camera', type: 'technology', refId: 'camera', position: { x: 1.4, y: 1.2, z: -2.2 }, scale: 0.7 },
    ],
    chapters: [
      { title: 'THE SCREEN', text: '3.5 英寸电容屏：一根手指，取代十二颗按键。', phoneIds: ['apple-iphone'], technologyId: 'display' },
      { title: 'THE CAMERA', text: '同年的 N95 挂上卡尔·蔡司——两条路线在同一年登顶。', phoneIds: ['nokia-n95'], technologyId: 'camera' },
      { title: 'THE INTERNET', text: '真正的网页第一次装进口袋，移动 web 有了观众。', phoneIds: ['apple-iphone'] },
    ],
    whatChanged: '手机从「打电话的机器」变成「一块会亮的屏幕」。',
  },
  {
    id: 'scene-2010',
    year: 2010,
    title: 'APP SMARTPHONE ERA',
    titleZh: '应用智能机时代',
    subtitle: '平台战争与大屏竞赛',
    description: 'Android 与 iOS 两强并立，应用生态成为购机的决定因素；Galaxy S 正面迎战 iPhone 4，大屏军备竞赛开始。',
    featuredPhoneIds: ['apple-iphone-4', 'samsung-galaxy-s', 'htc-dream'],
    technologyIds: ['network', 'processor', 'display'],
    brandIds: ['apple', 'samsung', 'htc'],
    storyIds: ['the-smartphone-era'],
    contextId: '2010',
    sourceIds: ['src-curation'],
    sceneType: 'documented',
    lightMood: 'clean-digital',
    curatedBy: 'MOBILE MUSEUM',
    objects: [
      { id: 'hero', type: 'phone', refId: 'apple-iphone-4', position: { x: 0, y: 0.9, z: 0 }, scale: 1.1 },
      { id: 'rel-galaxy-s', type: 'phone', refId: 'samsung-galaxy-s', position: { x: -2.0, y: 0.7, z: -1.5 }, scale: 0.95 },
      { id: 'rel-dream', type: 'phone', refId: 'htc-dream', position: { x: 2.1, y: 0.7, z: -1.9 }, scale: 0.9 },
      { id: 'net-4g', type: 'technology', refId: 'network', position: { x: 1.5, y: 1.7, z: -2.4 }, scale: 0.8 },
    ],
    chapters: [
      { title: 'THE PLATFORMS', text: '2008 年 Android 登场；2010 年，两套生态正面竞争。', phoneIds: ['htc-dream', 'apple-iphone-4'] },
      { title: 'THE SCREENS', text: 'Retina 与 AMOLED 把分辨率变成军备竞赛。', phoneIds: ['apple-iphone-4', 'samsung-galaxy-s'], technologyId: 'display' },
      { title: 'THE APPS', text: '应用商店取代规格表，成为手机真正的卖点。', technologyId: 'processor' },
    ],
    whatChanged: '手机第一次成为一切服务的入口。',
  },
  {
    id: 'scene-2019',
    year: 2019,
    title: 'FOLDABLE ERA',
    titleZh: '折叠时代',
    subtitle: '形态的边疆重新扩张',
    description: '柔性屏与铰链让口袋展开成平板。初代折叠屏娇气而昂贵，但「手机该长什么样」重新成为开放式问题。',
    featuredPhoneIds: ['samsung-galaxy-fold', 'motorola-razr-2019'],
    technologyIds: ['form-factor', 'display'],
    brandIds: ['samsung', 'motorola'],
    storyIds: ['the-foldable-era'],
    contextId: '2019',
    sourceIds: ['src-curation'],
    sceneType: 'documented',
    lightMood: 'minimal-reflective',
    curatedBy: 'MOBILE MUSEUM',
    objects: [
      { id: 'hero', type: 'phone', refId: 'samsung-galaxy-fold', position: { x: 0, y: 0.9, z: 0 }, scale: 1.1 },
      { id: 'rel-razr', type: 'phone', refId: 'motorola-razr-2019', position: { x: 2.1, y: 0.7, z: -1.5 }, scale: 0.95 },
      { id: 'tech-fold', type: 'technology', refId: 'form-factor', position: { x: -1.8, y: 1.6, z: -1.4 }, scale: 0.8 },
    ],
    chapters: [
      { title: 'THE HINGE', text: '几十个精密零件撑住每一次开合。', phoneIds: ['samsung-galaxy-fold'], technologyId: 'form-factor' },
      { title: 'THE CREASE', text: '聚合物代替玻璃，中央那道折痕是最诚实的工程笔记。', phoneIds: ['samsung-galaxy-fold'], technologyId: 'display' },
      { title: 'THE RETURN', text: 'RAZR 以柔性屏之名回归——翻盖的第二次生命。', phoneIds: ['motorola-razr-2019'] },
    ],
    whatChanged: '「手机该长什么样」重新变成开放式问题。',
  },
]

// ---- Technology Moments（规范 §25）----

export const technologyMoments: TechnologyMoment[] = [
  {
    technologyId: 'display',
    year: 2007,
    before: 'Physical keys · 小型单色屏',
    change: '电容多点触控：界面从物理键变成一整块玻璃。',
    after: 'Touch interface · 手势成为通用语言',
    phoneIds: ['ibm-simon', 'apple-iphone', 'apple-iphone-x'],
    storyIds: ['the-touchscreen-revolution'],
    sourceIds: ['src-curation'],
  },
  {
    technologyId: 'camera',
    year: 2000,
    before: '手机没有眼睛',
    change: '第一颗手机摄像头（夏普 J-SH04，0.11 MP）。',
    after: '计算摄影：软件就是相机',
    phoneIds: ['sharp-j-sh04', 'sony-ericsson-k750i', 'nokia-n95'],
    storyIds: ['the-camera-phone'],
    sourceIds: ['src-curation'],
  },
  {
    technologyId: 'network',
    year: 1992,
    before: '模拟蜂窝：只能通话',
    change: 'GSM 数字蜂窝量产：短信与国际漫游成为可能。',
    after: '3G / 4G / 5G：移动宽带与实时视频',
    phoneIds: ['nokia-1011', 'nokia-3210'],
    sourceIds: ['src-curation'],
  },
  {
    technologyId: 'form-factor',
    year: 2019,
    before: '屏幕是刚性的：形态多年未变',
    change: '柔性显示 + 精密铰链：屏幕可以弯折。',
    after: '口袋展开成平板，形态重新开放',
    phoneIds: ['samsung-galaxy-fold', 'motorola-razr-2019'],
    storyIds: ['the-foldable-era'],
    sourceIds: ['src-curation'],
  },
  {
    technologyId: 'processor',
    year: 2008,
    before: '手机系统功能固定',
    change: 'Android 与 App Store：手机成为软件平台。',
    after: '移动应用生态：一切服务的入口',
    phoneIds: ['htc-dream', 'apple-iphone-3g'],
    storyIds: ['the-smartphone-era'],
    sourceIds: ['src-curation'],
  },
]

// ---- Culture Layer（规范 §26–§27）----

export const cultureNodes: CultureNode[] = [
  {
    id: 'culture-sms',
    title: 'SMS 短信',
    year: 1999,
    description: '连锁短信与低廉资费，让「发消息」成为生活习惯。',
    relatedPhoneIds: ['nokia-3210', 'nokia-3310'],
    relatedTechnologyIds: ['network'],
    sourceIds: ['src-curation'],
  },
  {
    id: 'culture-snake',
    title: '贪吃蛇 Snake',
    year: 2000,
    description: '预装在诺基亚手机上的 Snake II，是一代人的第一个游戏。',
    relatedPhoneIds: ['nokia-3310'],
    sourceIds: ['src-curation'],
  },
  {
    id: 'culture-ringtones',
    title: '铃声文化',
    year: 2000,
    description: '可自定义铃声让手机在口袋之外也能表达个性。',
    relatedPhoneIds: ['nokia-3310'],
    sourceIds: ['src-curation'],
  },
  {
    id: 'culture-mobile-web',
    title: '移动网页',
    year: 2007,
    description: '真正的网页浏览器装进手机，互联网开始随人移动。',
    relatedPhoneIds: ['apple-iphone'],
    relatedTechnologyIds: ['network', 'display'],
    sourceIds: ['src-curation'],
  },
  {
    id: 'culture-app-stores',
    title: '应用商店',
    year: 2008,
    description: 'App Store 与 Android Market：买手机变成选生态。',
    relatedPhoneIds: ['apple-iphone-3g', 'htc-dream'],
    relatedTechnologyIds: ['processor'],
    sourceIds: ['src-curation'],
  },
  {
    id: 'culture-selfies',
    title: '自拍',
    year: 2010,
    description: '前置摄像头与美颜软件，让镜头同时朝向自己。',
    relatedPhoneIds: ['apple-iphone-4', 'samsung-galaxy-s'],
    relatedTechnologyIds: ['camera'],
    sourceIds: ['src-curation'],
  },
  {
    id: 'culture-mobile-photography',
    title: '移动摄影',
    year: 2007,
    description: '从 11 万像素到计算摄影——最好的相机是随身带的那台。',
    relatedPhoneIds: ['sharp-j-sh04', 'nokia-n95', 'huawei-p20-pro'],
    relatedTechnologyIds: ['camera'],
    sourceIds: ['src-curation'],
  },
]

export const CURRENT_REFERENCE_PHONE_ID = 'apple-iphone-15-pro'

/** Then / Now 的维度标签（§21）。 */
export interface ThenNowDimension {
  key: string
  label: string
  thenValue?: string | number
  nowValue?: string | number
  unit?: string
}

export const THEN_NOW_LABELS = [
  { key: 'screen', label: '屏幕尺寸', unit: '"' },
  { key: 'camera', label: '主摄像头', unit: '' },
  { key: 'network', label: '网络', unit: '' },
  { key: 'weight', label: '重量', unit: ' g' },
]

export function getScenesData() {
  return historicalScenes
}

export function getSceneById(id: string) {
  return historicalScenes.find((s) => s.id === id)
}

export function getCultureData() {
  return cultureNodes
}

export function getTechnologyMomentsData() {
  return technologyMoments
}

/** 场景中引用的 Phone（供校验用）。 */
export function scenePhoneRefs(scene: HistoricalScene): string[] {
  return [
    ...scene.featuredPhoneIds,
    ...scene.objects.filter((o) => o.type === 'phone' && o.refId).map((o) => o.refId!),
    ...scene.chapters.flatMap((c) => c.phoneIds ?? []),
  ]
}

export type { Phone }
