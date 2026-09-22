import type { Phone } from '../types'

// ============================================================
// V0.5 深度展品数据（规范 §10 / §12 / §14 / §17 / §32 / §40）：
// 结构 / 材料 / 细节 / 语音导览，全部为博物馆依据公开史料整理的
// 原创简体中文内容（与 phones.ts 同一策展标准）。
// 规范 §40：没有可靠资料的内容一律不写 —— 宁缺毋滥。
// 首批重点展品（§32）：DynaTAC / Nokia 3310 / RAZR V3 / iPhone 2007 / Galaxy Fold。
// ============================================================

/** 拆解部件（规范 §10）：modelNode 必须与程序化模型中注册的节点名一致。 */
export interface ExplodedPartSpec {
  id: string
  name: string
  modelNode?: string
  description?: string
}

/** 材料（规范 §14）：解释「为什么这个位置用这种材料」，而非换颜色。 */
export interface MaterialInfo {
  id: string
  name: string
  componentIds: string[]
  description?: string
  properties?: string[]
  reason?: string
}

/** 细节（规范 §12）：实际存在的部位。 */
export interface ExhibitDetailSpec {
  id: string
  name: string
  partId?: string
  description?: string
}

/** 语音导览（规范 §17）：预置音频 + 必配 transcript。 */
export interface AudioGuide {
  id: string
  phoneId: string
  title: string
  src: string
  duration?: number
  transcript?: string
  language?: 'zh-CN' | 'en-US'
}

export interface ExhibitContent {
  /** 部件介绍（用于 STRUCTURE / DETAIL / 拾取标签）。 */
  parts: ExplodedPartSpec[]
  materials: MaterialInfo[]
  details: ExhibitDetailSpec[]
  audio?: AudioGuide
}

const SOURCE_NOTE = '博物馆依据公开史料整理的原创综述（V0.5 规范 §40）'

export const exhibitContents: Record<string, ExhibitContent> = {
  'motorola-dynatac-8000x': {
    parts: [
      { id: 'antenna', name: '天线', modelNode: 'antenna', description: '一根四分之一波长的鞭状天线——1983 年把语音发上蜂窝网的代价。' },
      { id: 'speaker', name: '听筒', modelNode: 'speaker', description: '显示屏上方的发声孔，整机唯一的“语音出口”。' },
      { id: 'screen', name: 'LED 显示屏', modelNode: 'screen', description: '一段红色 LED 段码屏：只能显示拨出的号码，别无他物。' },
      { id: 'keypad', name: '键盘', modelNode: 'keypad', description: '十二颗机械按键，最多存十个号码。' },
      { id: 'sideButtons', name: '侧键', modelNode: 'sideButtons', description: '音量与锁定功能放在侧面——单手握砖时的唯一妥协。' },
      { id: 'pcb', name: '主板', modelNode: 'pcb', description: '分立元件承担着今天一整片晶圆的工作。' },
      { id: 'battery', name: '电池', modelNode: 'battery', description: '镍镉电池：充电十小时，通话约三十分钟。' },
      { id: 'backCover', name: '后盖', modelNode: 'backCover', description: '让它成为“砖头”的那块外壳。' },
    ],
    materials: [
      {
        id: 'abs',
        name: 'ABS 塑料',
        componentIds: ['housing', 'backCover', 'keypad'],
        description: '机身外壳整体采用注塑成型的 ABS 工程塑料。',
        properties: ['坚固', '易成型', '轻于金属'],
        reason: '要在手持重量里塞下电池与射频系统，外壳必须既耐用又能大批量注塑成型。',
      },
      {
        id: 'nicd',
        name: '镍镉电池（NiCd）',
        componentIds: ['battery'],
        description: '1983 年的主流可充电化学体系。',
        properties: ['能量密度低', '耐过充', '有记忆效应'],
        reason: '当年唯一成熟的便携充电方案——它直接决定了砖头的重量与通话时长。',
      },
    ],
    details: [
      { id: 'antenna', name: '鞭状天线', partId: 'antenna', description: '拉出后方可获得较稳定的蜂窝信号。' },
      { id: 'led', name: '红色 LED 号码屏', partId: 'screen', description: '不是为阅读信息而生——它只负责把你拨的号码亮出来。' },
      { id: 'memory', name: '十个号码的记忆', partId: 'pcb', description: '机内存储只够存十个常用号码。' },
    ],
    audio: {
      id: 'audio-dynatac-8000x',
      phoneId: 'motorola-dynatac-8000x',
      title: '第一块砖头',
      src: '/audio/guides/motorola-dynatac-8000x.m4a',
      language: 'zh-CN',
      transcript:
        '一九八三年，摩托罗拉把移动电话从车里搬进了手里。DynaTAC 八千X，高二十五厘米，重七百九十克，卖三千九百九十五美元，大约是一辆轿车的价钱。它有一根四分之一波长的鞭状天线，一段只能显示号码的红色LED屏，十二颗机械按键，最多存十个号码。它能通话三十分钟，充电却要十个小时。十年之前，马丁·库帕在纽约街头拨出史上第一通手持电话；十年之后，耗资约一亿美元，这台砖头让任何人都能买下那份自由。它开创了消费级移动通信市场，也让手机第一次成为身份的象征。它不是最好的手机，但此后所有的手机，都是它的后代。',
      duration: 57,
    },
  },

  'nokia-3310': {
    parts: [
      { id: 'screen', name: '单色液晶屏', modelNode: 'screen', description: '84 × 84 像素的单色屏，配一颗震动马达提醒你来电。' },
      { id: 'keypad', name: '一体式键盘', modelNode: 'keypad', description: '软胶按键连成一体，揉进了 3310 手感的一半记忆。' },
      { id: 'pcb', name: '主板', modelNode: 'pcb', description: '诺基亚 DCT3 平台主板——短信、贪吃蛇和七天待机都从这里来。' },
      { id: 'battery', name: '电池', modelNode: 'battery', description: '可充电锂电池，待机以“天”为单位计算。' },
      { id: 'backCover', name: 'Xpress-on 可换后盖', modelNode: 'backCover', description: '不用工具即可拆换的彩壳——3310 让“换壳”第一次成为大众文化。' },
    ],
    materials: [
      {
        id: 'abs',
        name: 'ABS 塑料',
        componentIds: ['backCover', 'keypad', 'pcb'],
        description: '前后壳与键盘均为抗摔的 ABS 塑料。',
        properties: ['抗冲击', '可染色', '成本可控'],
        reason: '3310 的卖点是“摔不坏”：塑料能吸收跌落冲击，也能染成任何一种你要的颜色。',
      },
      {
        id: 'lcd',
        name: '液晶面板',
        componentIds: ['screen'],
        description: '单色液晶，绿色背光。',
        properties: ['省电', '可读性好'],
        reason: '省下的每一毫安，都被换成了以天计的待机时间。',
      },
    ],
    details: [
      { id: 'snake', name: '贪吃蛇 II', partId: 'pcb', description: '预装的 Snake II，让这台手机成为一代人的第一台游戏机。' },
      { id: 'xpress', name: 'Xpress-on 换壳系统', partId: 'backCover', description: '前后壳均可徒手更换，官方与第三方彩壳共同构成了一种流行文化。' },
      { id: 'sms', name: '短信与连锁输入', partId: 'keypad', description: '3310 把短信从功能做成了习惯：可输入 459 字符的长短信与聊天连锁。' },
    ],
    audio: {
      id: 'audio-nokia-3310',
      phoneId: 'nokia-3310',
      title: '摔不坏的传说',
      src: '/audio/guides/nokia-3310.m4a',
      language: 'zh-CN',
      transcript:
        '二〇〇〇年九月，诺基亚发布了3310，一台最终卖出一亿两千六百万部的平价手机。它只有八十四乘八十四个像素的单色屏幕，抗摔的ABS塑料外壳，以及一套可以徒手更换的Xpress-on彩壳系统，换壳从此成为一种流行文化。它的短信可以连锁发送，贪吃蛇II让一代人第一次在手机上玩游戏，电池能待机好几天。人们从高处摔过它、坐过它、丢过它，捡起来，多半还能用。可靠性被做成了设计，一部廉价的手机就这样成了民间英雄，也成了诺基亚黄金年代的注脚。',
      duration: 48,
    },
  },

  'motorola-razr-v3': {
    parts: [
      { id: 'upper', name: '上盖（屏幕）', modelNode: 'upper', description: '翻盖上半部：内屏与听筒收在这块铝壳里。' },
      { id: 'hinge', name: '铰链', modelNode: 'hinge', description: '一次开合的手感，是 RAZR 全部工程学的落点。' },
      { id: 'lower', name: '下盖（键盘）', modelNode: 'lower', description: '电致发光键盘板：合上时是一块金属板，打开时按键自己亮起来。' },
    ],
    materials: [
      {
        id: 'aluminium',
        name: '航空级铝合金',
        componentIds: ['upper', 'lower'],
        description: '机身外壳采用阳极氧化的航空级铝合金（公开报道口径）。',
        properties: ['轻', '强', '可精密铣切'],
        reason: '要把翻盖机做到十三点九毫米，金属是唯一够薄又够硬的选择。',
      },
      {
        id: 'el-keypad',
        name: '电致发光键盘板',
        componentIds: ['lower'],
        description: '按键符号直接蚀刻在发光板上。',
        properties: ['超薄', '背光均匀'],
        reason: '传统键帽太厚——把键盘做成一块会发光的板，厚度立刻省下一半。',
      },
    ],
    details: [
      { id: 'etched', name: '蚀刻键盘', partId: 'lower', description: '按键符号经化学蚀刻于金属板，是 RAZR 最著名的细节。' },
      { id: 'hinge', name: '一体铰链', partId: 'hinge', description: '开合阻尼经过调校——“啪”的一声合上，是它的一部分身份。' },
      { id: 'camera', name: 'VGA 相机', partId: 'upper', description: '内置三十万像素相机：那个年代“够用”的标准答案。' },
    ],
    audio: {
      id: 'audio-razr-v3',
      phoneId: 'motorola-razr-v3',
      title: '刀锋',
      src: '/audio/guides/motorola-razr-v3.m4a',
      language: 'zh-CN',
      transcript:
        '二〇〇四年，摩托罗拉用一块铝合金回答了一个问题：翻盖机可以薄到什么程度。RAZR V3，十三点九毫米，刀锋因此得名。机身是阳极氧化的航空级铝合金，键盘不是一颗颗键帽，而是一块电致发光板，按键符号直接蚀刻在上面，合上时是一块金属，打开时按键自己亮起来。铰链的阻尼经过调校，啪的一声合上，是它身份的一部分。它还有一颗三十万像素的VGA相机和双彩屏。一亿三千万部的销量，让刀锋成了翻盖时代最后一个图腾：那是金属与铰链最后的黄金年代。',
      duration: 49,
    },
  },

  'apple-iphone': {
    parts: [
      { id: 'frontGlass', name: '前玻璃与触控层', modelNode: 'frontGlass', description: '整面玻璃下是一层电容触控——按键从此退场。' },
      { id: 'pcb', name: '逻辑主板', modelNode: 'pcb', description: 'ARM 芯片与闪存藏在电池旁的一块板上。' },
      { id: 'battery', name: '电池', modelNode: 'battery', description: '固定在机身内的锂电池——不可拆卸，从此成为行业惯例（或争议）。' },
      { id: 'backCover', name: '铝制后盖', modelNode: 'backCover', description: '阳极氧化铝背板，下部嵌有一块塑料天线窗。' },
    ],
    materials: [
      {
        id: 'glass',
        name: '光学级玻璃',
        componentIds: ['frontGlass'],
        description: '正面采用耐刮的光学玻璃（发布时官方口径：optical quality glass）。',
        properties: ['耐刮', '透光', '硬'],
        reason: '电容触控需要一块足够硬又足够透光的表面——塑料在当时满足不了两者。',
      },
      {
        id: 'aluminium',
        name: '阳极氧化铝',
        componentIds: ['backCover'],
        description: '背壳为铝合金，底部留有塑料天窗以保证信号。',
        properties: ['轻', '强', '导热'],
        reason: '金属让九毫米的机身有了结构刚度；塑料天窗则替无线电波留了门。',
      },
    ],
    details: [
      { id: 'home', name: 'Home 键', partId: 'frontGlass', description: '全机唯一一颗实体按键——按它，回到起点。' },
      { id: 'jack', name: '顶部耳机孔', partId: 'backCover', description: '3.5 毫米耳机孔在机身顶端——第一代 iPhone 的独特印记。' },
      { id: 'multitouch', name: '多点触控', partId: 'frontGlass', description: '双指缩放照片与网页——发布会上的那次捏合改变了整个行业。' },
    ],
    audio: {
      id: 'audio-apple-iphone',
      phoneId: 'apple-iphone',
      title: '二〇〇七，屏幕亮起',
      src: '/audio/guides/apple-iphone.m4a',
      language: 'zh-CN',
      transcript:
        '二〇〇七年一月九日，乔布斯站在旧金山的舞台上说：今天，苹果重新发明了电话。一部宽屏触控的iPod，一部革命性的手机，一台突破性的上网设备，不是三台设备，是一台。iPhone三点五英寸的玻璃下面是电容触控屏，双指一捏，就能缩放一张照片，这个手势后来属于全世界。铝制的机身，耳机孔在顶部，全机只有一颗实体按键，还有一颗两百万像素的相机。它没有3G，没有应用商店，电池不可拆卸，甚至不支持复制粘贴。但它把手机的定义，从按键与号码，改成了握在手里的一块会亮的屏幕。',
      duration: 51,
    },
  },

  'samsung-galaxy-fold': {
    parts: [
      { id: 'leftWing', name: '左翼屏', modelNode: 'leftWing', description: '折叠屏的左半——屏幕在这里第一次可以弯折。' },
      { id: 'rightWing', name: '右翼屏', modelNode: 'rightWing', description: '右半翼与左翼共享一整片柔性显示。' },
      { id: 'hinge', name: '铰链', modelNode: 'hinge', description: '几十个精密零件构成的铰链，是整台手机的骨骼。' },
    ],
    materials: [
      {
        id: 'polymer-display',
        name: '柔性显示聚合物',
        componentIds: ['leftWing', 'rightWing'],
        description: '可弯折的显示盖板（初代以聚合物保护层为主）。',
        properties: ['可弯折', '柔韧', '较软'],
        reason: '玻璃不会弯——屏幕要折叠，盖板必须换成聚合物，也因此在初代留下了明显的折痕与娇气。',
      },
      {
        id: 'aluminium',
        name: '铝合金框架',
        componentIds: ['hinge'],
        description: '铰链与中框采用铝合金结构。',
        properties: ['轻', '强', '可精密加工'],
        reason: '几十个铰链零件要塞进毫米级的空间，铝合金是唯一的候选。',
      },
    ],
    details: [
      { id: 'crease', name: '折痕', partId: 'leftWing', description: '展开后屏幕中央那道痕迹——初代折叠屏最诚实的一条工程笔记。' },
      { id: 'cover-screen', name: '外屏', partId: 'rightWing', description: '合上时仍可使用的窄长外屏，4.6 英寸。' },
      { id: 'multiwindow', name: '多窗口', partId: 'hinge', description: '展开的 7.3 英寸内屏可以同时开三个应用——平板与手机的边界第一次模糊。' },
    ],
    audio: {
      id: 'audio-galaxy-fold',
      phoneId: 'samsung-galaxy-fold',
      title: '屏幕开始折叠',
      src: '/audio/guides/samsung-galaxy-fold.m4a',
      language: 'zh-CN',
      transcript:
        '二〇一九年，手机行业回到一个一九八九年就出现过的老问题：屏幕能不能折起来？这一次，答案不再是塑料翻盖，而是一整片可以弯折的柔性显示。Galaxy Fold合上是一部四点六英寸的手机，展开是一台七点三英寸的小平板，一块屏幕从中间弯过去，铰链里藏着几十个精密零件。聚合物盖板代替了玻璃，代价是展开后中央那道折痕。初代的它娇气、昂贵，甚至因为屏幕问题推迟了发售。但多窗口、分屏、大屏游戏，形态自由的大门，从这一代重新打开了。折叠屏不再是一个概念，而是一个可以买到的未来。',
      duration: 51,
    },
  },
}

/** 首批重点展品 id（§32）。 */
export const FEATURED_EXHIBIT_IDS = Object.keys(exhibitContents)

export const EXHIBIT_SOURCE_NOTE = SOURCE_NOTE

/** 某展品是否有策展内容。 */
export function hasExhibitContent(phoneId: string): boolean {
  return Boolean(exhibitContents[phoneId])
}

/** 部件名兜底：结构数据缺失时仅显示部件名。 */
export function partNameOf(phone: Pick<Phone, 'id'>, partId: string): string | undefined {
  return exhibitContents[phone.id]?.parts.find((p) => p.id === partId)?.name
}
