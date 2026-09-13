# MOBILE MUSEUM

> Explore the evolution of mobile phones.
> A phone is never just a phone.

**手机历史博物馆** —— 一座手机主题的数字博物馆（简体中文为主）。从 1973 到 2026。
Vue 3 + TypeScript + Vite，完全解耦的 Three.js 展陈引擎 + GSAP ScrollTrigger 编排。

## 运行

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 类型检查（vue-tsc）+ 生产构建
npm run preview   # 预览生产构建
```

## 技术栈

| 层        | 选择                                            |
| --------- | ----------------------------------------------- |
| 框架      | Vue 3 (`<script setup>`) + TypeScript + Vite    |
| 路由      | Vue Router                                      |
| 3D        | Three.js（程序化模型 + PMREM 环境反射）          |
| 动画      | GSAP + ScrollTrigger，Lenis 平滑滚动             |
| 样式      | SCSS（无 UI 框架 —— 自建设计系统）               |

## 目录

```
src/
├── animations/          # 滚动编排（按页面拆分，仅 GSAP）
│   ├── home/HomeAnimation.ts         # 滚动 → 相机 → 叙事关键帧
│   └── timeline/TimelineAnimation.ts # 桌面横向行走 / 移动端渐显
├── components/
│   ├── common/          # MuseumButton/Label/Heading、GlassPanel、LoadingOverlay、
│   │                    # PhoneSilhouette（原创线稿展品图）
│   └── museum/          # MuseumNav（滚动隐藏）、MuseumBackground（颗粒/光池）、
│                        # MuseumProgress、MuseumCursor（桌面光标提示）
├── composables/         # useDevice、useMuseum、useCollection、useReducedMotion、
│                        # useSmoothScroll、useStageScene、useWebGL
├── data/                # V0.2 数据集：50 台手机 · 16 品牌 · 6 大类 55+ 技术节点 ·
│                        # 30 条历史事件 · formFactors（形态馆配置）
├── services/            # Service 层（async，可无缝替换为 API）
├── styles/              # _tokens（SCSS 变量/混入）· _variables · _reset · _typography · _global
├── three/               # Three.js —— 与 Vue 完全解耦
│   ├── core/            # Stage（单例渲染器+画布）、MuseumScene 基类、Renderer、
│   │                    # CameraController、AssetManager、ModelLoader
│   ├── camera/ lights/ materials/ effects/   # 灯光、PBR 材质、尘埃
│   ├── models/          # procedural:dynatac（可拆解主展品）+ 六大形态家族模型：
│   │                    # flip / bar / slider / qwerty / slab / foldable
│   ├── performance/     # PerformanceManager：LOW/MEDIUM/HIGH 分档 + FPS 看门狗
│   └── scenes/          # HomeScene · PhoneScene（360°+拆解）· AmbientScene
└── views/               # Home · Timeline · Phone · Brands · Brand · Technology ·
                         # FormFactor（形态馆）· Search · Collection · NotFound
```

## 架构守则（代码中已强制）

- **一块持久画布。** `Stage` 持有唯一渲染器，场景随路由切换；Vue 只表达意图
  （`useStageScene(() => new HomeScene())`），绝不持有逐帧数据。
- **滚动即镜头。** `HomeAnimation` 把钉住区域的滚动进度映射到相机/旋转关键帧；
  所有数字集中在一个关键帧表。
- **Service 层。** `phoneService`、`brandService`……均为 async，数据源换成真实 API
  无需改动视图。
- **销毁纪律。** 场景追踪并释放每一份几何体/材质/纹理；ScrollTrigger 在卸载时销毁。
- **减弱动态。** `prefers-reduced-motion` 缩短滚动旅程、阻尼相机振幅、关闭平滑滚动。

## 资源与版权

全部文字、SVG 线稿与程序化 3D 模型均为**本项目原创**——未使用任何第三方图片或模型，
无署名义务。历史事实依据公开的博物馆与厂商史料整理，发布前需最终事实复核。

## 真实图片资产管线（V0.2.5）

```bash
npm run assets:discover   # Wikidata 身份 + Commons 候选检索（需可访问 Wikimedia 的网络）
npm run assets:download   # 下载最佳候选 → public/phones/<id>/（本地 webp 化，附来源/许可证侧车）
npm run assets:verify     # 核验文件/尺寸/许可证；本地手动导入的图在此登记为 candidate
npm run assets:build      # 生成 src/data/assets/assets-manifest.json + assets-report.json
npm run assets:approve -- --id nokia-3210   # 人工审核后批准（candidate/verified → approved）
```

状态机：`missing → candidate → verified → approved`（可疑 → rejected）。
**只有 approved 的图片会被前端读取**；未登记的设备自动回退线稿图版并标注「图版待补」。
网络受限时走本地导入：手动把图片放进 `public/phones/<phone-id>/`（hero.webp / front.webp…），
再依次 `assets:verify` → 人工审核 → `assets:approve` → `assets:build`。管线幂等，可重复运行。
开发环境访问 `/dev/assets` 查看全部资产状态与预览。

## 已知边界（V0.2）

- 展品分级：17 台 Level-3 珍品支持 3D 展示（7 套程序化模型）；DynaTAC 8000X 独享
  拆解视图；其余展品按设计显示"档案图版"回退。
- 无后端、无 PWA、无音频 —— 遵循规范刻意不做。
- 搜索为本地数据集的客户端检索；UI 以简体中文为主，国际化可在数据层加
  LocalizedText 后按需扩展。

