import type { Technology } from './types'

// V0.2 — 六大技术章节，共 55 个里程碑节点（规范 §30–§34、§66）。全部文字原创。

export const technologies: Technology[] = [
  {
    id: 'display',
    name: '显示',
    category: 'display',
    startYear: 1983,
    description:
      '从只能显示电话号码的红色 LED 段码屏，到能折叠的柔性 OLED——屏幕是手机的脸面，也是它历史上最大的约束。',
    milestones: [
      { year: 1983, label: 'LED 段码屏', description: 'DynaTAC 时代的读数：只能显示数字，泛着红光。' },
      { year: 1992, label: '单色液晶', description: '几行字符——短信因此成为可能。' },
      { year: 1998, label: '第一块彩屏', description: '西门子 S10 为手机带来（四色）色彩。' },
      { year: 2007, label: '电容多点触控', description: '屏幕不再显示界面，它就是界面。' },
      { year: 2010, label: '视网膜与 Super AMOLED', description: '像素密度和浓郁对比成为营销战场。' },
      { year: 2014, label: '2K 分辨率', description: 'LG G3 率先把超高清塞进 5.5 英寸。' },
      { year: 2015, label: '双曲面屏', description: 'S6 Edge 让画面顺着机身两侧流下去。' },
      { year: 2017, label: 'OLED 主流化', description: 'iPhone X 转向 OLED，刘海时代开始。' },
      { year: 2019, label: '可折叠 OLED', description: '屏幕变成一种能弯折的材料。' },
      { year: 2021, label: 'LTPO 自适应刷新', description: '1–120 Hz 面板开始追求效率而不仅是亮度。' },
    ],
  },
  {
    id: 'camera',
    name: '影像',
    category: 'camera',
    startYear: 2000,
    description:
      '影像的进化从来不是一条直线：传感器、光学、防抖与计算各自在不同年代轮流改写"手机照片"的定义。像素数，只是故事里的一行。',
    milestones: [
      { year: 2000, label: '0.11 MP：第一部拍照手机', description: '夏普 J-SH04，一个最终改写摄影的新奇功能。' },
      { year: 2005, label: '2 MP 自动对焦', description: 'K750i：有对焦有闪光，照片值得留下。' },
      { year: 2007, label: '5 MP 光学', description: '诺基亚 N95 挂上卡尔·蔡司——手机开始追赶相机。' },
      { year: 2012, label: '光学防抖', description: 'Lumia 920 的悬浮镜头征服了夜晚。' },
      { year: 2014, label: '激光对焦', description: 'LG G3 用一束光解决暗光对焦。' },
      { year: 2016, label: '双摄与景深计算', description: '人像模式把软件变成一枚镜头。' },
      { year: 2018, label: '三摄与变焦', description: 'P20 Pro 三摄定规则，潜望镜带来 5 倍变焦。' },
      { year: 2019, label: '计算摄影成主旋律', description: 'Pixel 证明：软件就是相机。' },
      { year: 2020, label: '亿级像素与 AI 管线', description: '分辨率与计算融合为一套系统。' },
    ],
  },
  {
    id: 'network',
    name: '网络',
    category: 'network',
    startYear: 1979,
    description:
      '每一代网络都重新定义了手机的用途：语音、文字、媒体、视频、一切。手机只是故事的一半——看不见的网格决定另一半。',
    milestones: [
      { year: 1979, label: '1G：第一张蜂窝网络', description: 'NTT 在东京开通世界第一个商用蜂窝网。' },
      { year: 1991, label: '2G / GSM：数字化', description: '语音数字化；短信作为副产品诞生。' },
      { year: 2001, label: '3G：移动数据', description: '视频通话与移动互联网不再是科幻。' },
      { year: 2009, label: '4G / LTE：App 时代', description: '流媒体与应用商店默认你口袋里有宽带。' },
      { year: 2019, label: '5G：低时延', description: '千兆速率与毫秒时延，加上第一批折叠屏。' },
      { year: 2022, label: '卫星通信', description: '无地面网络时也能发出求救——天上有网。' },
      { year: 2026, label: '未来：5G-A 与星地一体', description: '网络成为泛在、AI 驱动设备的底座。' },
    ],
  },
  {
    id: 'processor',
    name: '处理器',
    category: 'processor',
    startYear: 1994,
    description:
      '手机的大脑从管理按键的单片机，进化为超越桌面电脑的系统级芯片——并且在路上学会了看、听和预测。',
    milestones: [
      { year: 1994, label: '微控制器时代', description: 'Dragonball 级芯片同时应付日历和传真。' },
      { year: 2000, label: 'ARM 移动化', description: '低功耗 RISC 成为行业通用语。' },
      { year: 2010, label: '第一代系统级芯片', description: '苹果 A4 与高通骁龙把一切集成进一颗芯片。' },
      { year: 2011, label: '四核竞赛', description: '核心数成了硅片时代的"像素数"。' },
      { year: 2013, label: '64 位与协处理器', description: 'A7 率先 64 位，运动协处理器常驻后台。' },
      { year: 2017, label: '神经网络引擎', description: 'A11 仿生给每个人的口袋装上 AI 加速器。' },
      { year: 2020, label: '5 纳米与端侧 AI', description: '翻译、摄影与助手不再依赖云端。' },
      { year: 2023, label: '3 纳米与桌面级 GPU', description: 'A17 Pro 把光追和主机级画质装进口袋。' },
    ],
  },
  {
    id: 'battery',
    name: '电池',
    category: 'battery',
    startYear: 1983,
    description:
      '移动史上最安静的革命是化学：每一种形态、每一块屏幕、每一代射频，都要先跟电池谈判。',
    milestones: [
      { year: 1983, label: '镍镉：通话 30 分钟', description: 'DynaTAC 的自由价码：充十小时电。' },
      { year: 1990, label: '镍氢与轻薄化', description: '更高能量密度缩小了手机，记忆效应退场。' },
      { year: 2000, label: '锂离子普及', description: '轻量化的能量撑起纤薄机身时代。' },
      { year: 2010, label: '3000 mAh 与大屏', description: '屏幕越长越大，电池越长越大来喂它。' },
      { year: 2016, label: '快充革命', description: 'VOOC "充电五分钟，通话两小时"。' },
      { year: 2019, label: '65W 有线 + 无线', description: '半小时回满成为旗舰常态。' },
      { year: 2023, label: '硅碳负极', description: '更致密的化学体系把续航塞进更薄的机身。' },
    ],
  },
  {
    id: 'form-factor',
    name: '形态',
    category: 'form-factor',
    startYear: 1983,
    description:
      '砖块、翻盖、滑盖、键盘、板砖、折叠——手机的形状，是每个时代的意识形态在塑料与金属上的投影。形式追随功能，也追随时尚。',
    milestones: [
      { year: 1983, label: '砖块', description: '一台手持电话，长得恰好就是它本身。' },
      { year: 1989, label: '口袋化', description: 'MicroTAC 翻折话筒，"便携"第一次当真。' },
      { year: 1996, label: '翻盖', description: 'StarTAC 把手机折上；一个手势就此诞生。' },
      { year: 2000, label: '滑盖与旋转', description: '机械运动成了行业最爱的装饰音。' },
      { year: 2007, label: '板砖（直板触屏）', description: '一个按键、一块屏幕、一种通用形态。' },
      { year: 2017, label: '全面屏', description: '边框退场；刘海登场。' },
      { year: 2019, label: '折叠', description: '板砖弯折——口袋变成了平板。' },
    ],
  },
]

export const getTechnologiesData = () => technologies
