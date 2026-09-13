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
      meta: { title: '我的手机史 — 手机历史博物馆' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '未找到 — 手机历史博物馆' },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
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
})

export default router
