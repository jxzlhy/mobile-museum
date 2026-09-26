import type { Brand } from './types'

// V0.2 — 16 个品牌（规范 §111 目标 15，含夏普实为 16）。
// 品牌馆专用字段：story（长故事）、highlights（关键数字）、status（现状）、
// sources（资料来源，规范 §68）。全部文字为原创简体中文综述，销量/份额
// 为公开报道的通行约数。

const COMMON_SOURCES = ['厂商官方史料与新闻稿', '维基百科 / Wikidata 综述', '公开报道的销量约数']

export const brands: Brand[] = [
  {
    id: 'ibm',
    name: 'IBM',
    nameEn: 'IBM',
    foundedYear: 1911,
    country: '美国',
    motto: 'Think.',
    description:
      'IBM 没有做成手机生意，却发明了它最重要的形态：1994 年的 IBM Simon 是公认的第一部智能手机——触摸屏、邮件、应用，一样不缺。它更像一位不经意的发明者：给出蓝图，然后离场。',
    featuredPhones: ['ibm-simon'],
    timeline: [
      { year: 1992, label: 'Bellsouth 合作', description: '与运营商 Bellsouth 合开项目，目标是一台「掌上电脑」。' },
      { year: 1994, label: 'IBM Simon', description: '第一部智能手机开售：触摸屏 + 邮件 + 传真。' },
      { year: 1995, label: '悄然离场', description: ' Simon 停产，IBM 再未涉足手机整机。' },
    ],
    story:
      'IBM 在手机史上的角色很特别：它做出了第一部智能手机，却几乎没有从里面赚到钱。1994 年的 IBM Simon 集触摸屏、电子邮件、传真与日历于一身——比 iPhone 早了十三年，比「智能手机」这个词早了十年。它重逾半公斤、续航以小时计、售价 899 美元，半年只卖出约五万台。对 IBM 来说这只是一次终端试验；对整个行业来说，这是一张提前画好的路线图。此后 IBM 专心做企业计算，把消费市场让给了后来者——但每当我们点击一块触摸屏，都在使用 Simon 画下的交互原点。',
    highlights: [
      { label: '公认第一部智能手机', value: 'IBM Simon (1994)' },
      { label: '专利与发明', value: '触摸屏 PDA 先声' },
      { label: '角色', value: '发明者而非玩家' },
    ],
    status: '已退出消费市场',
    sources: COMMON_SOURCES,
  },
  {
    id: 'motorola',
    name: '摩托罗拉',
    nameEn: 'Motorola',
    foundedYear: 1928,
    country: '美国',
    motto: 'Hello, Moto.',
    description:
      '摩托罗拉在 1973 年发明了手持移动电话，又在 1983 年卖出了世界上第一部可以买到的手机。从砖头、StarTAC 到 RAZR，它一次次把工程变成文化图腾。',
    featuredPhones: ['motorola-dynatac-prototype', 'motorola-dynatac-8000x', 'motorola-microtac', 'motorola-startac', 'motorola-razr-v3', 'motorola-milestone', 'motorola-razr-2019'],
    timeline: [
      { year: 1928, label: '加尔文制造公司', description: '从芝加哥的一间车载收音机小厂起家。' },
      { year: 1973, label: '第一次手持通话', description: '马丁·库帕团队在纽约街头拨出世界第一通手持蜂窝电话。' },
      { year: 1983, label: 'DynaTAC 8000X', description: '十年磨一剑，第一部商用手持移动电话开售。' },
      { year: 1996, label: 'StarTAC', description: '88 克翻盖，便携性的宣言。' },
      { year: 2004, label: 'RAZR V3', description: '金属刀锋，1.3 亿部销量。' },
      { year: 2019, label: 'RAZR 折叠屏', description: '刀锋以柔性屏之名复活。' },
    ],
    story:
      '1928 年，保罗·加尔文在芝加哥注册了一间做电池整流器的小厂，后来它靠车载收音机改名为 Motorola——"移动的声音"。1973 年 4 月 3 日，工程师马丁·库帕举着约两斤重的原型机站在纽约第六大道上，按下人类历史上第一通手持电话；对方是贝尔实验室的竞争对手。"我们打给谁不重要，重要的是手机能打出去。"此后十年，摩托罗拉烧掉约一亿美元，把原型机变成 1983 年售价 3,995 美元的 DynaTAC 8000X。整个九十年代它是世界第一大手机厂商，StarTAC 把手机做成身份符号；2004 年 RAZR V3 用 13.9 毫米的金属机身再创巅峰——却也因吃老本错过了智能手机转型。2012 年谷歌买下摩托罗拉移动（主要为专利），2014 年转手联想，"Moto" 以模块化与情怀复刻延续至今。',
    highlights: [
      { label: '第一部手持移动电话', value: '1973' },
      { label: 'RAZR V3 销量', value: '约 1.3 亿部' },
      { label: '九十年代行业地位', value: '全球第一' },
    ],
    status: '活跃（2014 年起隶属联想）',
    sources: COMMON_SOURCES,
  },
  {
    id: 'nokia',
    name: '诺基亚',
    nameEn: 'Nokia',
    foundedYear: 1865,
    country: '芬兰',
    motto: 'Connecting People.',
    description:
      '一家造纸厂，先后变成橡胶厂和科技巨头。诺基亚定义了功能机时代：1011 把 GSM 带向大众，3210 与 3310 成为民间图腾，N95 在智能手机前夜发起最后的高跳。',
    featuredPhones: ['nokia-1011', 'nokia-2110', 'nokia-8110', 'nokia-9000-communicator', 'nokia-3210', 'nokia-3310', 'nokia-ngage', 'nokia-n95', 'nokia-n9', 'nokia-lumia-920'],
    timeline: [
      { year: 1865, label: '坦佩雷河边', description: '弗雷德里克·艾德斯坦创办木浆造纸厂。' },
      { year: 1992, label: '诺基亚 1011', description: '第一部量产 GSM 手机，约玛·奥利拉押注电信。' },
      { year: 1999, label: '诺基亚 3210', description: '青年手机范本，约 1.6 亿部。' },
      { year: 2007, label: '巅峰时刻', description: '全球手机份额约 40%，智能手机终端出货第一。' },
      { year: 2013, label: '出售手机业务', description: '设备与服务部门售予微软。' },
      { year: 2016, label: 'HMD 授权复出', description: '"香蕉"与复刻机回归市场。' },
    ],
    story:
      '诺基亚的名字来自芬兰的一条河。这家 1865 年的造纸厂先后做过橡胶靴子和电缆，直到九十年代初才在CEO约玛·奥利拉的决断下 all in 电信——彼时它还只是个北欧多元化集团。押注 GSM 的 1011、内置天线的 3210、摔不坏的 3310 接连命中，1996 到 2001 年间诺基亚成长为欧洲市值最高的公司之一，2007 年全球每五部手机里有两部印着它的logo。"科技以人为本"不是 slogan 而是方法论：人机工学、待机时长、可换彩壳。但智能手机时代它把 Symbian 抱得太久、把 MeeGo 砍得太早，N9 的设计语言反而教会了后来者。2013 年手机业务卖予微软，2016 年 HMD 拿到品牌授权复刻回归——如今的主业是通信设备与专利。',
    highlights: [
      { label: '连续全球第一', value: '1998 — 2011' },
      { label: '巅峰全球份额', value: '约 40%（2007）' },
      { label: '3310 销量', value: '约 1.26 亿部' },
    ],
    status: '手机业务 2014 年售予微软（现由 HMD 以授权运营）',
    sources: COMMON_SOURCES,
  },
  {
    id: 'apple',
    name: '苹果',
    nameEn: 'Apple',
    foundedYear: 1976,
    country: '美国',
    motto: 'Think different.',
    description:
      '2007 年苹果入场并重新定义了手机：多点触控、软件优先，两年后是 App Store。此后的每一次 iPhone 迭代，都在重置整个行业的基线。',
    featuredPhones: ['apple-iphone', 'apple-iphone-3g', 'apple-iphone-4', 'apple-iphone-5s', 'apple-iphone-6', 'apple-iphone-x', 'apple-iphone-12', 'apple-iphone-15-pro'],
    timeline: [
      { year: 1976, label: '车库创业', description: '乔布斯、沃兹尼亚克与罗·韦恩创立苹果。' },
      { year: 2007, label: 'iPhone 发布', description: '"一个手机、一个 iPod、一个互联网通讯器"。' },
      { year: 2008, label: 'App Store', description: '应用经济的基础设施。' },
      { year: 2010, label: 'iPhone 4', description: '视网膜屏与玻璃三明治设计。' },
      { year: 2017, label: 'iPhone X', description: '全面屏与 Face ID。' },
      { year: 2023, label: 'iPhone 15 Pro', description: '钛金属、USB-C、3 纳米 A17 Pro。' },
    ],
    story:
      '苹果做手机的起点是一次防御：乔布斯讨厌自己口袋里的翻盖机，"它们都是垃圾"。2004 年起 Project Purple 在极度保密中并行了两个方向——iPod 式转盘输入与多点触控屏，最终触控版胜出。2007 年 1 月 9 日，乔布斯在 Macworld 上以"三合一产品"的经典桥段发布 iPhone，从此电话只是它最不重要的功能。App Store（2008）把手机变成平台，视网膜屏（2010）定下显示标准，Touch ID（2013）、大屏（2014）、Face ID 与全面屏（2017）一路把行业拖着走。iPhone 累计出货超过 23 亿部，长期拿走全行业大部分利润——它是消费电子史上最成功的产品，没有之一。',
    highlights: [
      { label: 'iPhone 累计出货', value: '超过 23 亿部' },
      { label: '定义的关键词', value: '多点触控 · App Store · 全面屏' },
      { label: '行业利润占比', value: '长期过半' },
    ],
    status: '活跃',
    sources: COMMON_SOURCES,
  },
  {
    id: 'samsung',
    name: '三星',
    nameEn: 'Samsung',
    foundedYear: 1938,
    country: '韩国',
    motto: 'Over the Horizon.',
    description:
      '三星的垂直整合——自有屏幕、存储、处理器与相机——让 Galaxy 系列自 2010 年起每年都与 iPhone 正面对抗。Note 教会世界大屏，Fold 打开了形态的新边疆。',
    featuredPhones: ['samsung-galaxy-s', 'samsung-galaxy-note', 'samsung-galaxy-s6-edge', 'samsung-galaxy-fold', 'samsung-galaxy-z-flip'],
    timeline: [
      { year: 1938, label: '水果摊起家', description: '李秉喆在大邱卖干鱼蔬菜创办三星商会。' },
      { year: 2010, label: 'Galaxy S', description: 'Super AMOLED 与王朝的开端。' },
      { year: 2011, label: 'Galaxy Note', description: '被群嘲的大屏成为新标准。' },
      { year: 2019, label: 'Galaxy Fold', description: '第一部主流折叠屏（经历延期风波）。' },
      { year: 2020, label: 'Z Flip', description: '竖折成为时尚单品。' },
    ],
    story:
      '三星做手机的历史比苹果长得多——1980 年代它就在给别人代工模拟手机，1990 年代在韩国本土做到第一，却始终被视为二线。转折来自垂直整合的狠劲：自家 OLED、DRAM、图像传感器、基带，从元器件到整机一手包办。2010 年 Galaxy S 出世，2011 年 Note 被嘲笑"没人要大屏手机"后卖出千万台，2012 年起三星登上全球出货第一并保持至今（与苹果交替）。S6 Edge 的双曲面屏和 Fold 的折叠屏都是它用供应链优势强行开创新品类的证明。代价也曾惨烈：Note 7 电池事件（2016）召回约 250 万部——但一部手机的自燃没有烧掉这家巨头的手机业务。',
    highlights: [
      { label: '全球出货第一', value: '2012 年起保持至今' },
      { label: 'Note 7 召回', value: '约 250 万部（2016）' },
      { label: '开创的品类', value: '大屏 · 曲面屏 · 折叠屏' },
    ],
    status: '活跃',
    sources: COMMON_SOURCES,
  },
  {
    id: 'sony-ericsson',
    name: '索尼爱立信',
    nameEn: 'Sony Ericsson',
    foundedYear: 2001,
    country: '日本 / 瑞典',
    motto: '让影像与声音合体。',
    description:
      '索尼的影像与音频，加上爱立信的射频工程——这家各占一半的合资公司短暂而耀眼：K750i 让手机相机赢得尊重，Walkman 系列定义了音乐手机。',
    featuredPhones: ['sony-ericsson-k750i', 'sony-ericsson-w800i'],
    timeline: [
      { year: 2001, label: '合资成立', description: '索尼与爱立信各自掏出手机业务合并。' },
      { year: 2005, label: 'K750i / W800i', description: '自动对焦摄影与 Walkman 音乐双线开花。' },
      { year: 2007, label: '出货巅峰', description: '年出货量约 1 亿部，全球第四。' },
      { year: 2012, label: '索尼全资', description: '十年合资落幕，品牌成为索尼移动。' },
    ],
    story:
      '2001 年，索尼的手机不赚钱，爱立信的手机也亏钱，两家索性各自掏出手机部门成立一家对半持股的新公司。日方的影像传感器、屏幕与 Walkman 音频，配上瑞典方的射频与工业设计，孕育了功能机时代最后的黄金产品线：K750i 证明手机相机可以当真，W800i 把 Walkman 的橙色传奇装进口袋。2007 年合资公司年出货破亿、全球第四——然后触摸屏时代到来，它没能拿出自己的"iPhone 时刻"。2012 年索尼买下全部股份，品牌只存活了十一年，却留下了"音乐手机"与"拍照手机"两个品类的完整范本。',
    highlights: [
      { label: '年出货巅峰', value: '约 1 亿部（2007）' },
      { label: '定义的品类', value: '音乐手机 · 拍照手机' },
      { label: '合资存续', value: '2001 — 2012' },
    ],
    status: '2012 年并入索尼移动',
    sources: COMMON_SOURCES,
  },
  {
    id: 'blackberry',
    name: '黑莓',
    nameEn: 'BlackBerry',
    foundedYear: 1984,
    country: '加拿大',
    motto: 'The office in your pocket.',
    description:
      'RIM 造出了运行世界邮件的手机：真能打字的键盘、永远在线的推送、企业信任的安全。触摸时代把它甩下，但它的 DNA——消息优先——最终赢得了胜利。',
    featuredPhones: ['blackberry-bold-9000', 'blackberry-curve-8520'],
    timeline: [
      { year: 1984, label: 'RIM 成立', description: '滑铁卢大学的两名工程学生创办 Research In Motion。' },
      { year: 2002, label: 'BlackBerry 5810', description: '第一部带通话能力的黑莓。' },
      { year: 2009, label: '巅峰时刻', description: '全球份额约 20%，美国市场一度过半。' },
      { year: 2016, label: '停止自研', description: '硬件转授权，押注软件与安全。' },
    ],
    story:
      '黑莓的前身是 1984 年两个滑铁卢大学毕业生的小公司 RIM，最早做无线数据终端。1999 年的 Blackberry 850 寻呼机配上"红莓"式的单键回复，意外敲开了华尔街的门——9·11 事件中纽约通信瘫痪、只有黑莓邮件仍在收发，从此它成了美国政府与全球 CEO 的器官。物理键盘 + 推送邮件 + BBM 即时通讯，让它在 2009 年握有全球约五分之一的市场；但 iPhone 与 Android 夹击之下，触屏黑莓屡战屡败，BB10 迟到三年。2016 年 RIM 停止自研手机转向软件授权（TCL 等贴牌），2022 年 classic 服务终止——全键盘的信仰者至今仍在二手市场淘 Bold。它的遗产活在每一条已读回执和推送通知里。',
    highlights: [
      { label: '巅峰全球份额', value: '约 20%（2009）' },
      { label: 'BBM 用户', value: '巅峰约 9000 万' },
      { label: '自研手机终止', value: '2016' },
    ],
    status: '2016 年退出自研手机（转向软件与授权）',
    sources: COMMON_SOURCES,
  },
  {
    id: 'htc',
    name: 'HTC',
    nameEn: 'HTC',
    foundedYear: 1997,
    country: '中国台湾',
    motto: 'Quietly brilliant.',
    description:
      'HTC 造出了第一部 Android 手机，并在随后几年贡献了行业最有趣的工业设计——直到竞争与规模消耗了这位先锋。Dream 的下巴至今仍是博物馆展品。',
    featuredPhones: ['htc-dream', 'htc-one-m7'],
    timeline: [
      { year: 1997, label: '宏达电成立', description: '卓火土与周永明创办，从 iPAQ 掌上电脑代工起家。' },
      { year: 2008, label: 'HTC Dream', description: '世界第一台 Android 手机。' },
      { year: 2011, label: '美国登顶', description: '一度成为美国最大智能手机厂商。' },
      { year: 2017, label: 'Pixel 团队出售', description: '谷歌以 11 亿美元收编手机设计团队。' },
    ],
    story:
      'HTC 是手机史上最典型的"先锋诅咒"。它靠康柏 iPAQ 掌上电脑的代工起家，是全球第一批做出 Windows Mobile 机的 ODM；2005 年推出自有品牌，2008 年与谷歌一起端出第一部 Android 手机 Dream。凭着先发优势，2011 年它一度登顶美国智能手机市场——然后专利战（被苹果起诉）、机海战术与缺乏自有生态把它拖回原点。即便如此，HTC One M7 的全铝一体机身与 BoomSound 双扬声器仍是 2013 年的年度设计。2017 年谷歌以 11 亿美元买走它约两千人的 Pixel 研发团队——今天每台 Pixel 的身子里都有 HTC 的基因。这家公司如今仍在，只是舞台换成了 VR。',
    highlights: [
      { label: '第一部 Android', value: 'HTC Dream（2008）' },
      { label: '美国市场排名', value: '一度第一（2011）' },
      { label: 'Pixel 团队交易', value: '11 亿美元（2017）' },
    ],
    status: '仍在运营（重心转向 VR）',
    sources: COMMON_SOURCES,
  },
  {
    id: 'xiaomi',
    name: '小米',
    nameEn: 'Xiaomi',
    foundedYear: 2010,
    country: '中国',
    motto: '为发烧而生。',
    description:
      '2010 年创立的小米，用十年浓缩了整个行业的打法：MIUI 社区先行、线上闪购、一半价格的旗舰配置。小米 1 重塑定价，MIX 预言全面屏。',
    featuredPhones: ['xiaomi-mi-1', 'xiaomi-mi-mix'],
    timeline: [
      { year: 2010, label: '一碗小米粥', description: '雷军与十余位创始人在银谷大厦喝粥创业。' },
      { year: 2011, label: '小米手机 1', description: '1999 元双核旗舰，官网闪购。' },
      { year: 2014, label: '中国第一', description: '成为中国市场份额第一的手机厂商。' },
      { year: 2016, label: '小米 MIX', description: '全面屏概念机，被芬兰设计博物馆等收藏。' },
      { year: 2021, label: '全球第二', description: '单季度出货超越苹果位列全球第二。' },
    ],
    story:
      '2010 年 4 月 6 日，雷军和十几个人在银谷大厦喝了一碗小米粥开工。第一件事不是做手机，而是先发 MIUI——靠一百个梦想赞助商的口碑滚出社区；2011 年 8 月小米手机 1 发布，1999 元的顶配直降行业价格锚点，官网闪购的饥饿营销成为中国互联网的集体记忆。2014 年它登顶中国，随后经历供应链与渠道危机又靠线下小米之家翻身；2016 年的 MIX 用一块"全面屏"惊艳世界并被多家设计博物馆收藏，2021 年单季度出货超越苹果跻身全球第二。从"为发烧而生"到"人车家全生态"，小米证明了互联网方法论可以重造一个最传统的制造业。',
    highlights: [
      { label: '创业到上市', value: '8 年（2018 港股）' },
      { label: '巅峰排名', value: '全球出货第二（2021）' },
      { label: '定价遗产', value: '1999 元锚点' },
    ],
    status: '活跃',
    sources: COMMON_SOURCES,
  },
  {
    id: 'siemens',
    name: '西门子',
    nameEn: 'Siemens',
    foundedYear: 1847,
    country: '德国',
    motto: '德系工程的手机篇章。',
    description:
      '西门子的手机部门是 2000 年代初欧洲市场的重要力量：S10 献上第一块彩色屏，SL45 塞进存储卡与 MP3。2005 年业务并入明基，德系手机的黄金年代落幕。',
    featuredPhones: ['siemens-s10'],
    timeline: [
      { year: 1847, label: '指针式电报机', description: '维尔纳·冯·西门子创立电气公司。' },
      { year: 1998, label: 'S10 彩屏', description: '世界第一块彩色手机屏幕。' },
      { year: 2001, label: 'SL45', description: '存储卡 + MP3 的超前实践。' },
      { year: 2005, label: '并入明基', description: '手机业务出售，德系品牌谢幕。' },
    ],
    story:
      '西门子做手机的资历比大多数品牌都老——这家 1847 年的电气巨头在 1958 年就造出了德国最早的便携电话之一。九十年代它靠着 C/S/M 系列直板机稳居欧洲前三，工程品味独树一帜：1998 年的 S10 让屏幕第一次亮起颜色，2001 年的 SL45 塞进可插存储卡与 MP3 播放器——比音乐手机浪潮早了整整四年，还有风行工地与户外的三防 Me45。但德系的严谨没能换来时尚时代的入场券：产品节奏慢、设计保守、软件薄弱，手机部门连年亏损，2005 年西门子倒贴 2.5 亿欧元把手机业务"送给"台湾明基，BenQ-Siemens 一年后破产清算。一个电气帝国的手机篇章，就这样以倒贴落幕。',
    highlights: [
      { label: '第一块彩色屏', value: 'S10（1998）' },
      { label: '超前实践', value: 'SL45 存储卡 + MP3（2001）' },
      { label: '退出方式', value: '倒贴出售（2005）' },
    ],
    status: '2005 年退出手机市场',
    sources: COMMON_SOURCES,
  },
  {
    id: 'sharp',
    name: '夏普',
    nameEn: 'Sharp',
    foundedYear: 1912,
    country: '日本',
    motto: '日本手机的记忆。',
    description:
      '夏普发明了第一部拍照手机 J-SH04，此后几十年在日本市场深耕旋转屏、高像素与裸眼 3D——那些没有走向世界、却领先世界的点子。',
    featuredPhones: ['sharp-j-sh04'],
    timeline: [
      { year: 1912, label: '早川金属', description: '早川德次在东京创办，以自动铅笔起家。' },
      { year: 2000, label: 'J-SH04', description: '世界第一部量产拍照手机（11 万像素）。' },
      { year: 2004, label: '旋转屏时代', description: 'AQUOS 手机把电视屏幕装进口袋。' },
      { year: 2016, label: '并入富士康', description: '夏普被鸿海收购，日本电子时代落幕之一页。' },
    ],
    story:
      '夏普是"日本手机的另一个宇宙"。这家 1912 年以自动铅笔起家的公司，靠液晶面板技术成为屏幕之王，也把这种偏执带进了手机：2000 年 11 月，J-Phone 网络上的 J-SH04 悄悄装上了 11 万像素 CCD 摄像头——世界第一部量产拍照手机，当时被欧美厂商视为玩具，几年后相机行业被改写。此后夏普在日本市场独美：旋转翻盖屏、960×640 的 ASV 屏、裸眼 3D、无边框 Crystal——几乎每台 AQUOS 都有一个十年后才流行的点子。可惜加拉帕戈斯式的孤岛进化没能出海，2016 年夏普被富士康收购。今天你手机里的那块屏，大概率仍与它的液晶血统有关。',
    highlights: [
      { label: '第一部拍照手机', value: 'J-SH04（2000）' },
      { label: '独门绝技', value: '液晶屏 · 旋转屏 · 裸眼 3D' },
      { label: '被收购', value: '富士康（2016）' },
    ],
    status: '日本市场小规模活跃',
    sources: COMMON_SOURCES,
  },
  {
    id: 'sony',
    name: '索尼',
    nameEn: 'Sony',
    foundedYear: 1946,
    country: '日本',
    motto: 'For the creators.',
    description:
      '吸收爱立信股份之后，索尼以 Xperia 之名独自前行：4K 屏、21:9 带鱼屏、微单相机技术下放——不为潮流妥协，为创作者服务的小众路线。',
    featuredPhones: ['sony-xperia-1'],
    timeline: [
      { year: 1946, label: '东京通信工业', description: '井深大与盛田昭夫在废墟中创办索尼前身。' },
      { year: 2012, label: 'Xperia 独立时代', description: '全资收购索尼爱立信，甩掉合资包袱。' },
      { year: 2019, label: 'Xperia 1', description: '第一部 4K 21:9 手机。' },
    ],
    story:
      '索尼的基因里写着两样东西：Walkman 的随身自由与特丽珑的显示偏执。2012 年全资收回索尼爱立信后，Xperia 走上了一条与所有安卓旗舰相反的路：别人砍分辨率它上 4K，别人做 16:9 它坚持 21:9 带鱼屏，别人堆大底它把微单的算法与实体快门键搬上手机——为了拍视频的创作者，而不是大多数用户。市场份额常年是个位数，却守住了广播级专业市场的一席：不少纪录片与剧集就用 Xperia 拍摄。在大厂纷纷退场的年代，索尼证明了"小而偏执"也是一种活法。',
    highlights: [
      { label: '全球唯一 4K 手机', value: 'Xperia 系列' },
      { label: '坚持的宽幅', value: '21:9 带鱼屏' },
      { label: '服务的用户', value: '影视创作者' },
    ],
    status: '活跃（小众路线）',
    sources: COMMON_SOURCES,
  },
  {
    id: 'lg',
    name: 'LG',
    nameEn: 'LG',
    foundedYear: 1958,
    country: '韩国',
    motto: 'Life’s Good.',
    description:
      'LG 的手机史就是一部工程怪癖史：巧克力时代的触摸滑盖、G 系列的 2K 屏与激光对焦、背面按键、模块化 G5。2021 年退出手机市场，留下满手的好点子。',
    featuredPhones: ['lg-chocolate-kg90', 'lg-g3'],
    timeline: [
      { year: 1958, label: '金星社', description: '具仁会创办 Lucky Goldstar 的电子事业。' },
      { year: 2006, label: '巧克力 KG90', description: '滑盖时尚机的巅峰营销。' },
      { year: 2014, label: 'LG G3', description: '第一部量产 2K 屏手机。' },
      { year: 2021, label: '正式退场', description: '宣布关闭手机业务，累计亏损数十亿美元。' },
    ],
    story:
      'LG（金星社）做手机的时间几乎和三星一样长，却始终活在邻居的阴影里。它的高光都带着一股"工程师的任性"：2006 年巧克力 KG90 用一块会发光的触摸滑盖统治了时尚版面；2013 年 G2 把所有按键放到背面；2014 年 G3 抢先全世界量产 2K 屏、G4 派生激光对焦；2015 年的 G5 干脆做成了底部可拔换模块的"模块化手机"——想象力满分，市场答卷不及格。连年亏损后，LG 在 2021 年 4 月正式宣布退出手机业务，把 5G 专利与员工留在了行业里。今天你手机的激光对焦、广角副摄里，都可能藏着 LG 试过的路。',
    highlights: [
      { label: '量产 2K 屏第一', value: 'LG G3（2014）' },
      { label: '最任性的设计', value: '背面按键 · 模块化 G5' },
      { label: '退出手机市场', value: '2021' },
    ],
    status: '2021 年退出手机市场',
    sources: COMMON_SOURCES,
  },
  {
    id: 'google',
    name: '谷歌',
    nameEn: 'Google',
    foundedYear: 1998,
    country: '美国',
    motto: 'Don’t be evil. — Software is the camera.',
    description:
      '从 Nexus 的"亲儿子"到 Pixel 的计算摄影，谷歌亲自做手机的理由始终如一：展示 Android 应该是什么样子。HDR+ 证明算法可以让硬件平庸的相机拍出顶级照片。',
    featuredPhones: ['nexus-one', 'google-pixel'],
    timeline: [
      { year: 1998, label: '斯坦福宿舍', description: '拉里·佩奇与谢尔盖·布林创办 Google。' },
      { year: 2005, label: '收购 Android', description: ' 手机操作系统之战的无声开局。' },
      { year: 2010, label: 'Nexus One', description: '"亲儿子"模式开启。' },
      { year: 2016, label: 'Pixel', description: '计算摄影的宣言。' },
    ],
    story:
      '谷歌做手机从来不是为了卖手机。2005 年它悄悄收购了安迪·鲁宾的小公司 Android，一年后 iPhone 发布，谷歌的反应是彻底推翻原有键盘方案重做触屏——2008 年 T-Mobile G1 出货，移动双寡头的另一半就此落座。2010 年起 Nexus 系列年年立标杆：纯净系统、最快更新、不预装垃圾。2016 年 Nexus 换名 Pixel，真正的杀招是 HDR+：传感器平平无奇，算法却让夜景直出大片——"计算摄影"从此成为整个行业的军备方向。Tensor 芯片、魔术橡皮擦、实时翻译……Pixel 的每一代发布会，讲的都是软件故事。它是这个馆里唯一一个"用手机演示操作系统"的品牌。',
    highlights: [
      { label: 'Android 份额', value: '全球约七成' },
      { label: '开创的方法论', value: '计算摄影（HDR+）' },
      { label: '亲儿子传统', value: 'Nexus → Pixel（2010 — ）' },
    ],
    status: '活跃',
    sources: COMMON_SOURCES,
  },
  {
    id: 'huawei',
    name: '华为',
    nameEn: 'Huawei',
    foundedYear: 1987,
    country: '中国',
    motto: '把不可能变成可能。',
    description:
      '从贴牌到自研麒麟芯片，华为用 P 与 Mate 双旗舰讲述了一个中国工程故事：徕卡三摄重写影像规则，麒麟 9000 在封锁之年交出 5nm 答卷。',
    featuredPhones: ['huawei-p20-pro', 'huawei-mate-40-pro'],
    timeline: [
      { year: 1987, label: '深圳民房创业', description: '任正非以 2.1 万元创办华为，最初代理交换机。' },
      { year: 2013, label: 'P6 / 品牌转向', description: '从运营商贴牌走向消费者品牌。' },
      { year: 2018, label: 'P20 Pro', description: '徕卡三摄开启多摄时代。' },
      { year: 2020, label: '全球第二', description: '单季度出货一度超越三星登顶。' },
    ],
    story:
      '1987 年，43 岁的退伍工程师任正非在深圳一间民房里用 2.1 万元创办华为，最早只是香港交换机的代理商。自研交换机赚到第一桶金后，华为用了二十年在通信设备上追至世界第一，手机起初只是"送路由器的赠品"。2011 年余承东接手终端，砍掉贴牌白牌全力做自有品牌：P6 的超薄、Mate 7 的大屏商务一炮而红，与徕卡合作的 P20 Pro 三摄改写了移动影像规则。2019 年起在极限外部压力下，华为经历了芯片断供、出售荣耀的至暗时刻，又在 2023 年带着自研芯片回归市场——Mate 60 的"轻舟已过万重山"成了现象级事件。无论评价如何，它是这个行业里工程纵深最完整的中国故事。',
    highlights: [
      { label: '巅峰全球排名', value: '单季度第一（2020 Q2）' },
      { label: '影像里程碑', value: '与徕卡合作三摄（2018）' },
      { label: '自研芯片', value: '麒麟系列（2014 — ）' },
    ],
    status: '活跃',
    sources: COMMON_SOURCES,
  },
  {
    id: 'oppo',
    name: 'OPPO',
    nameEn: 'OPPO',
    foundedYear: 2004,
    country: '中国',
    motto: 'Find X 的机械浪漫。',
    description:
      '以音乐手机起家，以影像和快充立身。Find X 的双轨潜升结构把"消灭刘海"做成了机械艺术，VOOC 闪充则改写了充电体验。',
    featuredPhones: ['oppo-find-x'],
    timeline: [
      { year: 2004, label: 'OPPO 成立', description: '陈明永等人创立，从 MP3/MP4 播放器起步。' },
      { year: 2014, label: 'VOOC 闪充', description: '"充电五分钟，通话两小时"。' },
      { year: 2018, label: 'Find X', description: '双轨潜升结构，无孔一体化机身。' },
    ],
    story:
      'OPPO 的故事从音乐开始：2004 年起家的 MP3 播放器以音质与做工立住口碑，2008 年转入手机。真正让它出圈的是两件事：一是 2014 年的 VOOC 闪充——低压大电流的独门方案让"充电五分钟，通话两小时"成为国民级广告词，有线快充的军备竞赛由它点燃；二是 2018 年的 Find X，为消灭刘海把前后摄像头整个做成会升起的"双轨潜升"结构，机械美学惊艳全球发布会。OPPO 还与一加、realme 同属欧加体系，共享供应链与技术。线下渠道深耕与"本分"文化，让它常年稳居中国前二、全球前四。',
    highlights: [
      { label: '国民级广告', value: '"充电五分钟，通话两小时"' },
      { label: '机械美学巅峰', value: 'Find X 双轨潜升（2018）' },
      { label: '全球排名', value: '稳居前四' },
    ],
    status: '活跃',
    sources: COMMON_SOURCES,
  },
  {
    id: 'vivo',
    name: 'vivo',
    nameEn: 'vivo',
    foundedYear: 2009,
    country: '中国',
    motto: '影像，始于热爱。',
    description:
      'vivo 把影像与音质当作信仰：NEX 的升降前摄与半屏指纹率先量产，X 系列与蔡司合作持续深耕影像——每次发布会都是一场工程演示。',
    featuredPhones: ['vivo-nex'],
    timeline: [
      { year: 2009, label: '步步高系新生', description: '从步步高体系独立出智能手机品牌。' },
      { year: 2018, label: 'vivo NEX', description: '升降前摄 + 半屏指纹，量产落地。' },
      { year: 2020, label: '蔡司全球合作', description: '影像联合研发，自研 V 系芯片。' },
    ],
    story:
      'vivo 从步步高的音乐手机基因里长出来，DNA 里刻着两样东西：Hi-Fi 与影像。2012 年的 X1 是当时世界最薄的智能手机还塞进了 Hi-Fi 芯片；2018 年的 NEX 用升降式前摄和半屏指纹给出"完整屏幕"的工程答案，与同月发布的 Find X 一起成为全面屏探索的双子星。此后它把宝押在光学上：自研 V 系影像芯片、与蔡司达成全球影像战略合作、X 系列的长焦人像成为口碑——手机影像的"光学派"代表。加上深耕多年的线下渠道与体育营销（世界杯官方用机），vivo 常年稳居中国与全球出货前列。',
    highlights: [
      { label: '工程名场面', value: 'NEX 升降前摄（2018）' },
      { label: '光学信仰', value: '蔡司全球影像合作伙伴' },
      { label: '出身', value: '步步高系（2009）' },
    ],
    status: '活跃',
    sources: COMMON_SOURCES,
  },
]

export const getBrandsData = () => brands
