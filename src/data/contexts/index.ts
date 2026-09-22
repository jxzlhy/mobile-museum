// ============================================================
// Historical Context（V0.6 规范 §19–§21 / §69）：
// 展品所处的时代环境。实体关系（phones/brands/technologies/events）
// 由 contextService 从权威数据按年份计算；culturalNotes /
// designTrends 为博物馆依据公开史料整理的原创短注（克制、
// 不使用"当时所有人都……"式绝对化表达，规范 §19）。
// 首批年份覆盖 §69 的推荐清单。
// ============================================================

export interface HistoricalContext {
  year: number
  phones?: string[]
  brands?: string[]
  technologies?: string[]
  networks?: string[]
  culturalNotes?: string[]
  designTrends?: string[]
  events?: string[]
}

/** 按年份策展的短注（只有有把握的年份才写）。 */
export const contextNotes: Record<number, Pick<HistoricalContext, 'culturalNotes' | 'designTrends' | 'networks'>> = {
  1983: {
    networks: ['1G (AMPS)'],
    culturalNotes: ['移动电话是少数人的奢侈品：一部砖头的价格接近一辆轿车。', '「车装电话」仍是商务身份的主流想象。'],
    designTrends: ['握把式机身与外置天线是电池与射频技术的直接妥协。', 'LED 段码屏只负责数字。'],
  },
  1994: {
    networks: ['2G (GSM)'],
    culturalNotes: ['GSM 与短信开始进入日常，数字蜂窝从实验走向消费。', '掌上电脑（PDA）概念正热，IBM Simon 是两个物种的第一次杂交。'],
    designTrends: ['直板与翻盖并存，天线开始从外置转向内置。', '单色液晶屏是绝对主流。'],
  },
  1999: {
    networks: ['2G (GSM)'],
    culturalNotes: ['短信与贪吃蛇让手机第一次成为娱乐与社交工具。', '可换彩壳把手机变成个人表达的一部分。'],
    designTrends: ['Xpress-on 式可换外壳流行，塑料被染成任何颜色。', '内置天线基本取代外置。'],
  },
  2007: {
    networks: ['2G (GSM) / 2.5G (EDGE)', '3G 已在全球铺开'],
    culturalNotes: ['iPhone 与 N95 同年：功能机的顶点与智能机的起点正面相遇。', '移动上网还慢，但屏幕开始值得盯着看了。'],
    designTrends: ['电容触摸屏登场，实体键盘开始退场。', '金属与玻璃取代塑料成为高端材料的代名词。'],
  },
  2010: {
    networks: ['3G 普及', '4G (LTE) 开始商用'],
    culturalNotes: ['App Store / Android Market 的应用生态成为购机的决定因素。', '大屏旗舰与"性价比"两条路线同时扩张。'],
    designTrends: ['触控大屏 + 少量按键成为统一范式。', 'AMOLED 与 Retina 屏幕把分辨率变成军备竞赛。'],
  },
  2017: {
    networks: ['4G (LTE) 普及', '5G 标准接近冻结'],
    culturalNotes: ['全面屏与屏占比成为发布会的核心词汇。', '计算摄影开始明显超越同价位相机。'],
    designTrends: ['Home 键退场，手势导航与面部识别上位。', '「刘海」与全面屏方案分化。'],
  },
  2019: {
    networks: ['5G 开始商用'],
    culturalNotes: ['柔性屏量产让"折叠"从概念变成可以买到（并且很贵）的产品。', '初代折叠屏的耐用性成为公开讨论的话题。'],
    designTrends: ['铰链成为新的精密工程舞台。', '聚合物盖板暂时取代玻璃——屏幕第一次需要"能弯"。'],
  },
}
