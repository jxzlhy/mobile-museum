import type { Phone } from './types'

// MUSEUM STORIES 数据（V0.3 §14–§23）：7 个专题展览。
// 每个专题 = 封面 + 引言 + 时间轴 + 重点展品 + 为什么重要 + 遗产。
// 文案克制：短句、事实、留白。

export interface MuseumStoryEvent {
  year: number
  title: string
  description?: string
  phoneId?: string
}

export interface MuseumStory {
  id: string
  /** 英文展示标题（视觉层）。 */
  title: string
  /** 中文标题。 */
  titleZh: string
  subtitle?: string
  period?: { startYear?: number; endYear?: number }
  intro?: string
  timeline?: MuseumStoryEvent[]
  featuredPhoneIds?: string[]
  whyItMattered?: string
  legacy?: string[]
  tags?: string[]
}

export const stories: MuseumStory[] = [
  {
    id: 'the-first-mobile-phone',
    title: 'THE FIRST MOBILE PHONE',
    titleZh: '第一次，电话离开了墙',
    subtitle: '1973 — 1983',
    period: { startYear: 1973, endYear: 1983 },
    intro:
      '1973 年 4 月 3 日，马丁·库帕站在纽约街头，拨出了世界上第一通手持电话。从那天到第一部开售的手机，还有十年要走。',
    timeline: [
      { year: 1973, title: '第一次手持通话', description: 'DynaTAC 原型机，十年的时间差就此开始。', phoneId: 'motorola-dynatac-prototype' },
      { year: 1979, title: '网格亮起', description: 'NTT 在东京开通世界第一个商用蜂窝网络。' },
      { year: 1983, title: '砖头开售', description: 'DynaTAC 8000X，3,995 美元，通话三十分钟。', phoneId: 'motorola-dynatac-8000x' },
    ],
    featuredPhoneIds: ['motorola-dynatac-prototype', 'motorola-dynatac-8000x'],
    whyItMattered: '电话第一次属于个人，而不是属于一个地方。',
    legacy: ['每一部口袋里的手机', '都是这通电话的回声'],
    tags: ['起源', '1G'],
  },
  {
    id: 'the-first-smartphone',
    title: 'THE FIRST SMARTPHONE',
    titleZh: '最早的智能手机，晚了十五年',
    subtitle: '1994 — 1996',
    period: { startYear: 1994, endYear: 1996 },
    intro:
      '触摸屏、邮件、App——1994 年的 IBM Simon 全都有。世界还没准备好，它卖得很差。但方向从此没有变过。',
    timeline: [
      { year: 1994, title: 'IBM Simon', description: '触摸屏 + 应用 + 电话，第一次合体。', phoneId: 'ibm-simon' },
      { year: 1996, title: '诺基亚 9000', description: '翻开来是办公室的全键盘 Communicator。', phoneId: 'nokia-9000-communicator' },
    ],
    featuredPhoneIds: ['ibm-simon', 'nokia-9000-communicator'],
    whyItMattered: '手机从"打电话的机器"变成了"装进 pocket 的计算机"——概念自此成立。',
    legacy: ['今天的每一部智能手机', '都在兑现 Simon 的设想'],
    tags: ['智能机', '起源'],
  },
  {
    id: 'the-touchscreen-revolution',
    title: 'THE TOUCHSCREEN REVOLUTION',
    titleZh: '触摸革命',
    subtitle: '1994 — 2017',
    period: { startYear: 1994, endYear: 2017 },
    intro: '按键退场，屏幕登场。当界面从物理键变成一整块玻璃，手机才真正变成了软件的容器。',
    timeline: [
      { year: 1994, title: 'Simon 的第一次尝试', description: '电阻触摸屏，手写笔输入。', phoneId: 'ibm-simon' },
      { year: 2007, title: '电容多点触控', description: 'iPhone：一根手指就够。', phoneId: 'apple-iphone' },
      { year: 2017, title: '屏幕即手机', description: 'iPhone X 砍掉 Home 键，手势导航接管一切。', phoneId: 'apple-iphone-x' },
    ],
    featuredPhoneIds: ['ibm-simon', 'apple-iphone', 'apple-iphone-x'],
    whyItMattered: '界面一旦变成屏幕，手机就成了一切应用的舞台。',
    legacy: ['一种手势', '成了一种语言'],
    tags: ['触摸屏', '交互'],
  },
  {
    id: 'the-camera-phone',
    title: 'THE CAMERA PHONE',
    titleZh: '口袋里的眼睛',
    subtitle: '2000 — 2023',
    period: { startYear: 2000, endYear: 2023 },
    intro:
      '11 万像素的玩笑，最后杀死了整个卡片相机行业。手机影像的二十年，是光学与算法合谋的二十年。',
    timeline: [
      { year: 2000, title: '第一颗摄像头', description: '夏普 J-SH04，0.11 MP。', phoneId: 'sharp-j-sh04' },
      { year: 2005, title: '自动对焦', description: 'K750i 让照片值得保留。', phoneId: 'sony-ericsson-k750i' },
      { year: 2007, title: '光学觉醒', description: 'N95 挂上卡尔·蔡司。', phoneId: 'nokia-n95' },
      { year: 2018, title: '三摄与夜景', description: 'P20 Pro 重写规则。', phoneId: 'huawei-p20-pro' },
      { year: 2023, title: '计算摄影成熟', description: '15 Pro：软件就是相机。', phoneId: 'apple-iphone-15-pro' },
    ],
    featuredPhoneIds: ['sharp-j-sh04', 'sony-ericsson-k750i', 'nokia-n95', 'huawei-p20-pro', 'apple-iphone-15-pro'],
    whyItMattered: '最好的相机，是你随身带着的那一台。',
    legacy: ['人人都是拍摄者', '每一刻都值得被记录'],
    tags: ['影像', '计算摄影'],
  },
  {
    id: 'the-rise-of-nokia',
    title: 'THE RISE OF NOKIA',
    titleZh: '诺基亚时代',
    subtitle: '1992 — 2012',
    period: { startYear: 1992, endYear: 2012 },
    intro:
      '一家造纸厂统治了手机世界十五年：1998 到 2011 年全球第一，每两部手机里就有一部印着它的名字。然后，智能手机来了。',
    timeline: [
      { year: 1992, title: 'GSM 开局', description: '1011，第一部量产 GSM 手机。', phoneId: 'nokia-1011' },
      { year: 1999, title: '3210 现象', description: '1.6 亿部，手机成为日常。', phoneId: 'nokia-3210' },
      { year: 2000, title: '3310 传说', description: '摔不坏的国民手机。', phoneId: 'nokia-3310' },
      { year: 2007, title: 'N95 的最后一跳', description: '功能机的顶点，与 iPhone 同年。', phoneId: 'nokia-n95' },
      { year: 2012, title: 'Lumia 落幕', description: 'PureView 的光，照亮退场路。', phoneId: 'nokia-lumia-920' },
    ],
    featuredPhoneIds: ['nokia-1011', 'nokia-3210', 'nokia-3310', 'nokia-n95', 'nokia-lumia-920'],
    whyItMattered: '它教会世界用手机——也被世界教会了谦逊。',
    legacy: ['Connecting People', '从未过时'],
    tags: ['诺基亚', '功能机'],
  },
  {
    id: 'the-smartphone-era',
    title: 'THE SMARTPHONE ERA',
    titleZh: '智能手机时代',
    subtitle: '2007 — 2015',
    period: { startYear: 2007, endYear: 2015 },
    intro:
      '2007 年之后的八年里，手机变成了电脑、钱包、相机和游戏机。平台战争、大屏革命、互联网手机——一切都在这八年里发生。',
    timeline: [
      { year: 2007, title: 'iPhone', description: '多点触控重设规则。', phoneId: 'apple-iphone' },
      { year: 2008, title: 'Android 登场', description: 'HTC Dream 与 App Store 同年。', phoneId: 'htc-dream' },
      { year: 2010, title: '两强并立', description: 'iPhone 4 与 Galaxy S 正面对抗。', phoneId: 'samsung-galaxy-s' },
      { year: 2011, title: '大屏与性价比', description: 'Galaxy Note 被嘲笑后大卖；小米 1 重写定价。', phoneId: 'xiaomi-mi-1' },
    ],
    featuredPhoneIds: ['apple-iphone', 'htc-dream', 'samsung-galaxy-s', 'xiaomi-mi-1'],
    whyItMattered: '手机第一次成为一切服务的入口。',
    legacy: ['一部手机', '一个操作系统', '一种生活方式'],
    tags: ['智能机', '平台'],
  },
  {
    id: 'the-foldable-era',
    title: 'THE FOLDABLE ERA',
    titleZh: '折叠时代',
    subtitle: '2019 —',
    period: { startYear: 2019 },
    intro:
      '2019 年，板砖形态裂开了。柔性屏与铰链让口袋展开成平板——手机形态的边疆，重新开始扩张。',
    timeline: [
      { year: 2019, title: 'Galaxy Fold', description: '第一部主流折叠屏（延期后发售）。', phoneId: 'samsung-galaxy-fold' },
      { year: 2019, title: 'RAZR 回归', description: '刀锋以柔性屏之名折起。', phoneId: 'motorola-razr-2019' },
      { year: 2020, title: 'Z Flip', description: '对折之后只有粉盒大小。', phoneId: 'samsung-galaxy-z-flip' },
    ],
    featuredPhoneIds: ['samsung-galaxy-fold', 'motorola-razr-2019', 'samsung-galaxy-z-flip'],
    whyItMattered: '当一块屏幕可以弯折，"手机该长什么样"重新变成了开放式问题。',
    legacy: ['形态的边疆', '仍在扩张'],
    tags: ['折叠屏', '形态'],
  },
]

export const getStoriesData = () => stories
