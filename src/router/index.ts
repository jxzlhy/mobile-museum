import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import { phoneService } from '@/services/phoneService'
import { brandService } from '@/services/brandService'

// 路由（规范 §70）+ 每页独立标题（规范 §85）。
// GitHub Pages 为纯静态托管，深链接刷新会 404——
// 部署模式（--mode github）下自动切换为 hash 路由，本地保持 web 路由。
const isPagesBuild = import.meta.env.MODE === 'github'

const router = createRouter({
  history: isPagesBuild ? createWebHashHistory() : createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '手机历史博物馆 — MOBILE MUSEUM' },
    },
    {
      path: '/timeline',
      name: 'timeline',
      component: () => import('@/views/TimelineView.vue'),
      meta: { title: '时间长廊 · 1973—2026 — 手机历史博物馆' },
    },
    {
      path: '/phones',
      name: 'phones',
      component: () => import('@/views/PhonesView.vue'),
      meta: { title: '全部藏品 · ALL PHONES — 手机历史博物馆' },
    },
    {
      path: '/explore',
      name: 'explore',
      component: () => import('@/views/ExploreView.vue'),
      meta: { title: '探索 · EXPLORE — 手机历史博物馆' },
    },
    {
      path: '/explore/graph',
      name: 'graph',
      component: () => import('@/views/GraphView.vue'),
      meta: {
        title: '关系图谱 · HISTORICAL GRAPH — 手机历史博物馆',
        description: '品牌、年代、技术、专题如何把每件展品连进手机历史。',
      },
    },
    {
      path: '/explore/journeys',
      name: 'journeys',
      component: () => import('@/views/JourneysView.vue'),
      meta: { title: '策展路线 · CURATED JOURNEYS — 手机历史博物馆' },
    },
    {
      path: '/explore/journeys/:id',
      name: 'journey',
      component: () => import('@/views/JourneyView.vue'),
      meta: { title: '策展路线 — 手机历史博物馆' },
    },
    {
      path: '/explore/context/:year',
      name: 'context',
      component: () => import('@/views/ContextView.vue'),
      meta: { title: '时代环境 · CONTEXT — 手机历史博物馆' },
    },
    {
      path: '/explore/evolution',
      name: 'evolution',
      component: () => import('@/views/EvolutionView.vue'),
      meta: {
        title: '手机演化史 · EVOLUTION — 手机历史博物馆',
        description: '拖动五十年（1973—2026），看手机的重量、屏幕与形态如何一步步长成今天的样子。',
      },
    },
    {
      path: '/explore/stories',
      name: 'stories',
      component: () => import('@/views/StoriesView.vue'),
      meta: { title: '专题展览 · MUSEUM STORIES — 手机历史博物馆' },
    },
    {
      path: '/explore/stories/:id',
      name: 'story',
      component: () => import('@/views/StoryView.vue'),
      meta: { title: '专题展览 — 手机历史博物馆' },
    },
    {
      path: '/compare',
      name: 'compare',
      component: () => import('@/views/CompareView.vue'),
      meta: {
        title: '对比实验室 · COMPARE — 手机历史博物馆',
        description: '任选两台真实设备，看它们之间隔着多少年的变化。',
      },
    },
    {
      path: '/dev/assets',
      name: 'dev-assets',
      component: () => import('@/views/DevAssetsView.vue'),
      meta: { title: 'Asset Debug — 手机历史博物馆' },
    },
    {
      path: '/museum',
      name: 'museum',
      component: () => import('@/views/MuseumHallView.vue'),
      meta: {
        title: '博物馆主展厅 · THE MUSEUM — 手机历史博物馆',
        description: '走进三维主展厅：历史、设计、技术、形态与珍藏五个展区，穿行五十年。',
      },
    },
    {
      path: '/museum/treasures',
      name: 'museum-treasures',
      component: () => import('@/views/MuseumHallView.vue'),
      meta: {
        title: '珍藏展厅 · TREASURE ROOM — 手机历史博物馆',
        description: '馆藏珍品：照片、3D 与故事俱备的那些机器。',
      },
    },
    {
      path: '/museum/exhibit/:id',
      name: 'exhibit',
      component: () => import('@/views/ExhibitView.vue'),
      meta: {
        title: '深度观展 · LIVING EXHIBIT — 手机历史博物馆',
        description: '同一件展品的不同观察方式：实拍、3D、结构拆解、材料与语音导览。',
      },
    },
    {
      path: '/exhibition/share/:payload',
      name: 'exhibition-share',
      component: () => import('@/views/ExhibitionShareView.vue'),
      meta: { title: '个人策展分享 — 手机历史博物馆' },
    },
    {
      path: '/curator',
      name: 'curator',
      component: () => import('@/views/CuratorStudioView.vue'),
      meta: {
        title: '策展工作台 · CURATOR STUDIO — 手机历史博物馆',
        description: '把发现过的手机、故事与场景，组织成属于你的数字展览。',
      },
    },
    {
      path: '/curator/:id',
      name: 'curator-editor',
      component: () => import('@/views/CuratorEditorView.vue'),
      meta: { title: '编辑展览 · CURATOR STUDIO — 手机历史博物馆' },
    },
    {
      path: '/curator/:id/preview',
      name: 'curator-preview',
      component: () => import('@/views/ExhibitionPreviewView.vue'),
      meta: { title: '个人展览预览 — 手机历史博物馆' },
    },
    {
      path: '/museum/time-machine',
      name: 'time-machine',
      component: () => import('@/views/TimeMachineView.vue'),
      meta: {
        title: '时间机器 · TIME MACHINE — 手机历史博物馆',
        description: '拖动年份，走进按年代重构的数字历史展厅。',
      },
    },
    {
      path: '/museum/time-machine/:year',
      name: 'time-machine-scene',
      component: () => import('@/views/SceneView.vue'),
      meta: { title: '历史场景 — 手机历史博物馆' },
    },
    {
      path: '/phone/:id',
      name: 'phone',
      component: () => import('@/views/PhoneView.vue'),
      meta: { title: '展品 — 手机历史博物馆' },
    },
    {
      path: '/brands',
      name: 'brands',
      component: () => import('@/views/BrandsView.vue'),
      meta: { title: '品牌馆 — 手机历史博物馆' },
    },
    {
      path: '/brand/:id',
      name: 'brand',
      component: () => import('@/views/BrandView.vue'),
      meta: { title: '品牌 — 手机历史博物馆' },
    },
    {
      path: '/technology',
      name: 'technology',
      component: () => import('@/views/TechnologyView.vue'),
      meta: { title: '技术馆 — 手机历史博物馆' },
    },
    {
      path: '/form-factor',
      name: 'form-factor',
      component: () => import('@/views/FormFactorView.vue'),
      meta: { title: '形态馆 — 手机历史博物馆' },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchView.vue'),
      meta: { title: '搜索 — 手机历史博物馆' },
    },
    {
      path: '/collection',
      name: 'collection',
      component: () => import('@/views/CollectionView.vue'),
      meta: { title: '我的博物馆 · MY MUSEUM — 手机历史博物馆' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '未找到 — 手机历史博物馆' },
    },
  ],
  // 仅路径变化时回到顶部；查询参数同步（?room=/?focus=，规范 §47）
  // 不得打断滚动驱动的相机。
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
    return {}
  },
})

// 详情页动态标题
router.afterEach(async (to) => {
  if (to.name === 'phone') {
    const phone = await phoneService.getPhoneById(String(to.params.id))
    if (phone) document.title = `${phone.name}（${phone.releaseYear}）— 手机历史博物馆`
    return
  }
  if (to.name === 'brand') {
    const brand = await brandService.getBrandById(String(to.params.id))
    if (brand) document.title = `${brand.name} — 手机历史博物馆`
    return
  }
  const title = to.meta.title as string | undefined
  if (title) document.title = title
  const description = to.meta.description as string | undefined
  let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (description) {
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.name = 'description'
      document.head.appendChild(metaDesc)
    }
    metaDesc.content = description
  }
})

export default router
