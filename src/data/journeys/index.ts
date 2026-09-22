// ============================================================
// Curated Journeys（V0.6 规范 §13–§15 / §68）：
// Journey 不是 Story —— Story 讲一个主题，Journey 带参观者
// 连续走进一组展品。每一段行程都必须给出明确 reason（§12），
// 全部基于已有关系，不做黑盒推荐（§73）。
// phoneIds 均来自 phones.ts 的真实 id（规范 §80：不得有 broken ID）。
// ============================================================

export interface DiscoveryStop {
  phoneId?: string
  storyId?: string
  technologyId?: string
  eventId?: string
  /** 为什么这一站在路线上（可解释性）。 */
  reason: string
}

export interface DiscoveryPath {
  id: string
  title: string
  titleZh: string
  description?: string
  basis: 'timeline' | 'brand' | 'technology' | 'form-factor' | 'story'
  stops: DiscoveryStop[]
}

export const journeys: DiscoveryPath[] = [
  {
    id: 'from-buttons-to-touch',
    title: 'FROM BUTTONS TO TOUCH',
    titleZh: '从按键到触摸',
    description: '按键如何一步步交出控制权，屏幕如何成为手机本身。',
    basis: 'story',
    stops: [
      { phoneId: 'ibm-simon', reason: '起点：1994 年的第一块触摸屏——电阻屏加手写笔。' },
      { phoneId: 'nokia-9000-communicator', reason: '同时代的另一条路线：全键盘智能机，按键的全盛形态。' },
      { phoneId: 'apple-iphone', reason: '2007 年：电容多点触控，一根手指取代键盘。' },
      { phoneId: 'htc-dream', reason: '2008 年：Android 登场，实体键与触屏的过渡形态。' },
      { phoneId: 'apple-iphone-x', reason: '终点：2017 年 Home 键退场，手势接管一切。' },
    ],
  },
  {
    id: 'the-rise-of-nokia',
    title: 'THE RISE OF NOKIA',
    titleZh: '诺基亚时代',
    description: '从第一部量产 GSM 手机到功能机的顶点，再到退场。',
    basis: 'brand',
    stops: [
      { phoneId: 'nokia-1011', reason: '1992 年：诺基亚第一部量产 GSM 手机，时代的开局。' },
      { phoneId: 'nokia-3210', reason: '1999 年：1.6 亿部，手机成为日用品。' },
      { phoneId: 'nokia-3310', reason: '2000 年：继任者，也是最著名的国民手机。' },
      { phoneId: 'nokia-n95', reason: '2007 年：功能机的顶点，与 iPhone 同年。' },
      { phoneId: 'nokia-lumia-920', reason: '2012 年：Windows Phone 的努力与落幕。' },
    ],
  },
  {
    id: 'the-smartphone-revolution',
    title: 'THE SMARTPHONE REVOLUTION',
    titleZh: '智能手机革命',
    description: '2007 年之后的平台战争：iOS、Android 与性价比玩家。',
    basis: 'story',
    stops: [
      { phoneId: 'apple-iphone', reason: '2007 年：多点触控重设规则。' },
      { phoneId: 'htc-dream', reason: '2008 年：第一部 Android 手机，平台战争开始。' },
      { phoneId: 'samsung-galaxy-s', reason: '2010 年：Galaxy 系列正面迎战 iPhone。' },
      { phoneId: 'xiaomi-mi-1', reason: '2011 年：互联网模式重写性价比。' },
      { phoneId: 'apple-iphone-x', reason: '2017 年：全面屏成为智能手机的终点形态。' },
    ],
  },
  {
    id: 'the-camera-phone',
    title: 'THE CAMERA PHONE',
    titleZh: '口袋里的眼睛',
    description: '从 11 万像素的玩笑，到杀死卡片相机的计算摄影。',
    basis: 'technology',
    stops: [
      { phoneId: 'sharp-j-sh04', reason: '2000 年：第一颗手机摄像头，0.11 MP。' },
      { phoneId: 'sony-ericsson-k750i', reason: '2005 年：自动对焦让照片值得保留。' },
      { phoneId: 'nokia-n95', reason: '2007 年：卡尔·蔡司镜头，光学觉醒。' },
      { phoneId: 'huawei-p20-pro', reason: '2018 年：三摄与夜景，算法开始接管。' },
      { phoneId: 'apple-iphone-15-pro', reason: '2023 年：计算摄影成熟，软件就是相机。' },
    ],
  },
  {
    id: 'the-first-mobile-phone',
    title: 'THE FIRST MOBILE PHONE',
    titleZh: '电话离开墙',
    description: '从纽约街头的一通电话，到第一部买得到的手机。',
    basis: 'timeline',
    stops: [
      { phoneId: 'motorola-dynatac-prototype', reason: '1973 年：史上第一通手持电话。' },
      { phoneId: 'motorola-dynatac-8000x', reason: '1983 年：十年之后，第一部商用手机。' },
      { phoneId: 'motorola-microtac', reason: '1989 年：继任者，第一次把"便携"当真。' },
      { phoneId: 'motorola-startac', reason: '1996 年：翻盖时代开启，砖头彻底成为历史。' },
    ],
  },
  {
    id: 'the-foldable-era',
    title: 'THE FOLDABLE ERA',
    titleZh: '折叠时代',
    description: '柔性屏让板砖形态裂开，口袋展开成平板。',
    basis: 'form-factor',
    stops: [
      { phoneId: 'samsung-galaxy-fold', reason: '2019 年：第一部主流折叠屏。' },
      { phoneId: 'motorola-razr-2019', reason: '2019 年：刀锋以柔性屏之名回归。' },
      { phoneId: 'samsung-galaxy-z-flip', reason: '2020 年：对折之后只有粉盒大小。' },
    ],
  },
]

export const getJourneys = () => journeys

export function getJourneyById(id: string): DiscoveryPath | undefined {
  return journeys.find((j) => j.id === id)
}
