<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Stage } from '@/three/core/Stage'
import { MuseumHallScene, type HallPlan, type HallExhibitAnchor } from '@/three/scenes/MuseumHallScene'
import { museumService, type MuseumRoom, type NearbyExhibit } from '@/services/museumService'
import { museumState } from '@/services/museumState'
import { discoveryService } from '@/services/discoveryService'
import { phoneService } from '@/services/phoneService'
import { useMuseum } from '@/composables/useMuseum'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useDevice } from '@/composables/useDevice'
import { getSmoothScroll } from '@/composables/useSmoothScroll'
import { resolvePhoneImage } from '@/data/assets'
import type { Phone } from '@/data/types'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import MuseumMap from '@/components/museum/MuseumMap.vue'
import ExhibitOverlay from '@/components/museum/ExhibitOverlay.vue'

// ============================================================
// Museum Hall（V0.4 规范 §5–§11 / §47 / §65）：
// 三维主展厅。移动端：Vertical Scroll + Swipe + Tap + Camera
// Transition（规范 §7）；桌面端：滚轮 + 拖拽环视 + 悬停 + 点击（§8）。
// 展厅入口 → 主厅 → 历史厅 → 设计厅 → 技术厅 → 形态厅 → 珍藏厅，
// 年代耳室经地图或时代选择进入（§30）。
// ============================================================

const route = useRoute()
const router = useRouter()
const museum = useMuseum()
const reduced = useReducedMotion()
const { isDesktop } = useDevice()

const ready = ref(false)
const sectionsEl = ref<HTMLElement>()
const sectionEls = ref<HTMLElement[]>([])

interface ZoneUi {
  room: MuseumRoom
  phones: Phone[]
}
const zones = ref<ZoneUi[]>([])
const eras = ref<ZoneUi[]>([])
const totalCount = ref(0)
const yearSpan = ref('')

const scene = ref<MuseumHallScene | null>(null)

// ---- 覆盖层状态 ----
const focused = ref<Phone | null>(null)
const nearby = ref<NearbyExhibit[]>([])
const mapOpen = ref(false)
const eraOpen = ref<string | null>(null)

// ---- HUD ----
const currentRoom = ref<string | undefined>()
const discovered = ref(0)
let offDiscovery: (() => void) | null = null

const currentRoomMeta = computed(() => {
  if (!currentRoom.value) return null
  return [...zones.value, ...eras.value].find((z) => z.room.id === currentRoom.value)?.room ?? null
})

const roomLabel = computed(() => {
  if (!currentRoomMeta.value) return 'THE MUSEUM'
  return `${currentRoomMeta.value.titleZh} · ${currentRoomMeta.value.title}`
})

const eraUi = computed(() => eras.value.find((e) => e.room.id === eraOpen.value) ?? null)
const discoveredSet = ref(new Set<string>())

// ============================================================
// 数据与场景
// ============================================================

let hallScene: MuseumHallScene | null = null
let rafPending = false

async function init() {
  const [zoneRooms, eraRooms, all] = await Promise.all([
    museumService.getRooms(),
    museumService.getEraRooms(),
    phoneService.getPhones(),
  ])
  totalCount.value = all.length
  const years = all.map((p) => p.releaseYear)
  yearSpan.value = `${Math.min(...years)} — ${Math.max(...years)}`

  const withPhones = await Promise.all(
    zoneRooms.map(async (room) => ({ room, phones: await museumService.getRoomExhibits(room.id) })),
  )
  const withEraPhones = await Promise.all(
    eraRooms.map(async (room) => ({ room, phones: await museumService.getRoomExhibits(room.id) })),
  )
  zones.value = withPhones
  eras.value = withEraPhones

  ready.value = true
  await nextTick()
  measureSections()

  if (museum.state.webgl) {
    const plan: HallPlan = { zones: withPhones, eras: withEraPhones, reduced: reduced.value }
    hallScene = new MuseumHallScene(plan)
    scene.value = hallScene
    try {
      await Stage.setScene(hallScene)
    } catch (err) {
      console.error('[MuseumHall] 场景构建失败，页面仍以图文方式可用（规范 §74）', err)
      hallScene = null
      scene.value = null
    }
  }

  applyScroll()
  await restoreFromQuery()

  const progress = await discoveryService.getProgress()
  discovered.value = progress.discovered
  discoveredSet.value = new Set(discoveryService.getDiscoveries().map((d) => d.phoneId))
  offDiscovery = discoveryService.onChange((d) => {
    discovered.value += 1
    const next = new Set(discoveredSet.value)
    next.add(d.phoneId)
    discoveredSet.value = next
  })
}

// ============================================================
// 滚动 → 相机（规范 §7：穿过展厅）
// ============================================================

function measureSections() {
  const root = sectionsEl.value
  if (!root) return
  sectionEls.value = Array.from(root.querySelectorAll('[data-hall-section]'))
}

function sectionRanges(): Array<{ top: number; bottom: number }> {
  return sectionEls.value.map((el) => {
    const top = el.offsetTop
    return { top, bottom: top + el.offsetHeight }
  })
}

function onScroll() {
  applyScroll()
  syncRoomQuery()
}

function applyScroll() {
  if (!hallScene) return
  const ranges = sectionRanges()
  if (ranges.length === 0) return
  const y = window.scrollY
  const vh = window.innerHeight

  // 段内线性插值：滚动到第 k 段顶部 = 位姿 k（规范 §65 的动线映射）
  let idx = 0
  let f = 0
  for (let i = 0; i < ranges.length; i++) {
    const start = ranges[i]!.top - (i === 0 ? 0 : vh * 0.25)
    const end = (ranges[i + 1]?.top ?? ranges[i]!.bottom) - vh * 0.25
    if (y >= start) {
      idx = i
      f = end > start ? Math.min(1, Math.max(0, (y - start) / (end - start))) : 0
    }
  }
  hallScene.applyScrollPose(idx + f)

  const section = sectionEls.value[idx]
  const roomId = (section?.getAttribute('data-hall-section') || undefined) as string | undefined
  if (roomId !== currentRoom.value) {
    currentRoom.value = roomId
    museumState.setRoom(roomId)
  }
}

let roomQueryTimer: ReturnType<typeof setTimeout> | null = null
function syncRoomQuery() {
  if (roomQueryTimer) clearTimeout(roomQueryTimer)
  roomQueryTimer = setTimeout(() => {
    const q = { ...route.query }
    if (currentRoom.value) q.room = currentRoom.value
    else delete q.room
    if (q.room !== route.query.room) router.replace({ query: q })
  }, 400)
}

// ============================================================
// 展品交互（规范 §8 / §14）
// ============================================================

let downX = 0
let downY = 0
let lastX = 0
let dragged = false
let pointerActive = false

function onPointerDown(e: PointerEvent) {
  // 忽略来自交互控件（按钮 / 链接 / 覆盖层）的按下
  const target = e.target as HTMLElement
  if (target.closest('button, a, input, [role="dialog"]')) return
  pointerActive = true
  dragged = false
  downX = lastX = e.clientX
  downY = e.clientY
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
}

function onPointerMove(e: PointerEvent) {
  if (!pointerActive || !hallScene) return
  const dx = e.clientX - downX
  const dy = e.clientY - downY
  if (!dragged && Math.hypot(dx, dy) > 7) dragged = true

  if (dragged && (e.buttons & 1) === 1) {
    // 拖拽环视（规范 §8）：横向增量 → 偏航
    hallScene.hallCamera.addYaw((e.clientX - lastX) * 0.003)
  }
  lastX = e.clientX

  // 桌面悬停：高亮展品（规范 §14：靠近提示）
  if (isDesktop.value && !dragged) {
    const anchor = pickAt(e.clientX, e.clientY)
    hallScene.setHighlight(anchor)
    hoverAnchor.value = Boolean(anchor)
  }
}

const hoverAnchor = ref(false)

function onPointerUp(e: PointerEvent) {
  window.removeEventListener('pointermove', onPointerMove)
  if (!pointerActive) return
  pointerActive = false
  if (!dragged && hallScene) {
    const anchor = pickAt(e.clientX, e.clientY)
    if (anchor) void focusPhoneById(anchor.phoneId)
  } else {
    hallScene?.hallCamera.resetYaw()
  }
}

function pickAt(cx: number, cy: number): HallExhibitAnchor | null {
  if (!hallScene) return null
  return hallScene.pick((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1)
}

// ============================================================
// 聚焦 / 覆盖层（规范 §23–§27 / §47）
// ============================================================

async function focusPhoneById(id: string) {
  const phone = await phoneService.getPhoneById(id)
  if (!phone) return
  void focusPhone(phone)
}

async function focusPhone(phone: Phone) {
  focused.value = phone
  museumState.setFocus(phone.id)
  nearby.value = await museumService.getNearbyExhibits(phone.id, 3)
  lockScroll(true)

  if (route.query.focus !== phone.id) {
    router.replace({ query: { ...route.query, focus: phone.id } })
  }

  if (hallScene) {
    const anchor = hallScene.getAnchor(phone.id)
    if (anchor) {
      await hallScene.focusExhibit(phone.id)
    }
  }
}

function closeFocus() {
  const q = { ...route.query }
  delete q.focus
  router.replace({ query: q })
  focused.value = null
  museumState.clearFocus()
  lockScroll(false)
  void hallScene?.exitRoom()
}

async function onNearbyNavigate(phone: Phone) {
  // 先换内容再飞行：相机滑向目标展品（规范 §27）
  focused.value = phone
  museumState.setFocus(phone.id)
  nearby.value = await museumService.getNearbyExhibits(phone.id, 3)
  router.replace({ query: { ...route.query, focus: phone.id } })
  if (hallScene) {
    const anchor = hallScene.getAnchor(phone.id)
    if (anchor) void hallScene.focusExhibit(phone.id)
  }
}

// ============================================================
// 年代耳室（规范 §30–§33）
// ============================================================

async function openEra(eraId: string) {
  eraOpen.value = eraId
  mapOpen.value = false
  museumState.setRoom(eraId)
  lockScroll(true)
  const q = { ...route.query }
  q.room = eraId
  router.replace({ query: q })
  if (hallScene) await hallScene.enterRoom(eraId)
}

function closeEra() {
  eraOpen.value = null
  lockScroll(false)
  void hallScene?.exitRoom()
  const q = { ...route.query }
  if (currentRoom.value) q.room = currentRoom.value
  else delete q.room
  router.replace({ query: q })
}

// ============================================================
// 地图（规范 §17–§19）
// ============================================================

function onMapSelect(roomId: string) {
  mapOpen.value = false
  const isEra = eras.value.some((e) => e.room.id === roomId)
  if (isEra) {
    void openEra(roomId)
    return
  }
  // 走廊展区：平滑滚动到对应章节，相机随动线走过去
  const idx = zones.value.findIndex((z) => z.room.id === roomId)
  const el = sectionEls.value[idx + 2] // 0 入口 1 主厅
  if (!el) return
  const lenis = getSmoothScroll()
  if (lenis) lenis.scrollTo(el.offsetTop, { duration: 1.6 })
  else window.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
}

// ============================================================
// URL 恢复（规范 §47：刷新后状态可恢复）
// ============================================================

async function restoreFromQuery() {
  const focusId = route.query.focus ? String(route.query.focus) : null
  const roomId = route.query.room ? String(route.query.room) : null

  if (route.name === 'museum-treasures' && !roomId && !focusId) {
    const el = sectionEls.value.find((s) => s.getAttribute('data-hall-section') === 'treasures')
    if (el) window.scrollTo(0, el.offsetTop)
    return
  }
  if (focusId) {
    await focusPhoneById(focusId)
    return
  }
  if (roomId && eras.value.some((e) => e.room.id === roomId)) {
    await openEra(roomId)
    return
  }
  if (roomId) {
    const idx = zones.value.findIndex((z) => z.room.id === roomId)
    const el = sectionEls.value[idx + 2]
    if (el) window.scrollTo(0, el.offsetTop)
  }
}

// ============================================================
// 滚动锁 / 生命周期
// ============================================================

function lockScroll(lock: boolean) {
  const lenis = getSmoothScroll()
  if (lock) {
    lenis?.stop()
    document.body.style.overflow = 'hidden'
  } else {
    lenis?.start()
    document.body.style.overflow = ''
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (focused.value) closeFocus()
  else if (mapOpen.value) mapOpen.value = false
  else if (eraOpen.value) closeEra()
}

function onResize() {
  measureSections()
  applyScroll()
}

function tick() {
  rafPending = false
  applyScroll()
  if (!focused.value && !eraOpen.value) syncRoomQuery()
}

function onScrollRaf() {
  if (!rafPending) {
    rafPending = true
    requestAnimationFrame(tick)
  }
}

onMounted(async () => {
  window.addEventListener('scroll', onScrollRaf, { passive: true })
  window.addEventListener('resize', onResize)
  document.addEventListener('keydown', onKeydown)
  await init()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScrollRaf)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('pointermove', onPointerMove)
  offDiscovery?.()
  offDiscovery = null
  hallScene = null
  scene.value = null
  lockScroll(false)
  Stage.clearScene()
})

watch(reduced, () => {
  hallScene?.setReduced(reduced.value)
})

/** 入口 ENTER：滚到主厅（模板里不能用 window，收敛成方法）。 */
function enterHall() {
  const el = sectionEls.value[1]
  if (!el) return
  const lenis = getSmoothScroll()
  if (lenis) lenis.scrollTo(el.offsetTop, { duration: 1.4 })
  else window.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
}
</script>

<template>
  <div
    class="hall"
    :data-cursor="hoverAnchor ? '看展' : undefined"
    @pointerdown="onPointerDown"
  >
    <div ref="sectionsEl" class="hall__flow">
      <!-- ====== 入口（规范 §10）====== -->
      <section data-hall-section="" class="hall__section hall__entrance">
        <div class="hall__entrance-inner container">
          <p class="label mono">THE MUSEUM · 三维主展厅</p>
          <h1 class="hall__entrance-title heading-1">走进<br />博物馆</h1>
          <p class="hall__entrance-meta mono">{{ totalCount }}+ EXHIBITS · {{ yearSpan }}</p>
          <p class="body-lg hall__entrance-note">不是在网页里切换页面——是在展厅之间走动。</p>
          <div class="hall__entrance-actions">
            <MuseumButton variant="cta" @click="enterHall">ENTER · 进入</MuseumButton>
          </div>
          <p class="hall__entrance-skip label">或直接向下滚动 · 可随时跳过</p>
        </div>
      </section>

      <!-- ====== 主厅 ====== -->
      <section data-hall-section="" class="hall__section hall__main">
        <div class="container hall__main-inner">
          <p class="label mono">MAIN HALL · 主厅</p>
          <h2 class="heading-2">五十年，一条动线。</h2>
          <p class="body-md hall__lede">
            沿走廊向前：历史、设计、技术、形态，尽端是珍藏厅。两侧的耳室里，是六个年代。
          </p>
          <ol class="hall__guide" aria-label="展区导览">
            <li v-for="z in zones" :key="z.room.id" class="hall__guide-row" @click="onMapSelect(z.room.id)">
              <span class="mono hall__guide-index">{{ String(zones.indexOf(z) + 1).padStart(2, '0') }}</span>
              <span class="hall__guide-zh">{{ z.room.titleZh }}</span>
              <span class="label hall__guide-en">{{ z.room.title }}</span>
              <span class="mono hall__guide-count">{{ z.room.exhibitIds.length }} 件</span>
            </li>
          </ol>
        </div>
      </section>

      <!-- ====== 展区 ====== -->
      <section
        v-for="z in zones"
        :key="z.room.id"
        :data-hall-section="z.room.id"
        class="hall__section hall__zone"
      >
        <div class="container hall__zone-inner">
          <header class="hall__zone-head">
            <p class="label mono">{{ z.room.title }}<template v-if="z.room.subtitle"> · {{ z.room.subtitle }}</template></p>
            <h2 class="heading-1 hall__zone-title">{{ z.room.titleZh }}</h2>
            <p v-if="z.room.description" class="body-lg hall__zone-desc">{{ z.room.description }}</p>
          </header>

          <!-- 展签清单（DOM 文本承载信息，规范 §63） -->
          <ul class="hall__exhibits" aria-label="本展区展品">
            <li v-for="p in z.phones" :key="p.id">
              <button class="hall__exhibit" :data-cursor="p.exhibitLevel === 3 ? '珍藏' : '看展'" @click="focusPhoneById(p.id)">
                <span class="mono hall__exhibit-no">{{ p.exhibitNo ?? 'MM' }}</span>
                <span class="hall__exhibit-photo"><PhonePhoto :phone="p" thumb /></span>
                <span class="hall__exhibit-body">
                  <span class="hall__exhibit-name">{{ p.name }}</span>
                  <span class="label hall__exhibit-meta">{{ p.brandName }} · {{ p.releaseYear }}<template v-if="p.exhibitLevel === 3"> · 珍藏</template></span>
                </span>
                <span v-if="discoveredSet.has(p.id)" class="hall__seen mono" aria-label="已发现">✓</span>
                <span class="mono hall__exhibit-arrow" aria-hidden="true">→</span>
              </button>
            </li>
          </ul>
        </div>
      </section>

      <!-- ====== 年代耳室索引 ====== -->
      <section data-hall-section="" class="hall__section hall__eras">
        <div class="container">
          <p class="label mono">ERA ROOMS · 年代耳室</p>
          <h2 class="heading-1 hall__eras-title">六个年代，<br />六个房间。</h2>
          <div class="hall__era-grid">
            <button v-for="e in eras" :key="e.room.id" class="hall__era" @click="openEra(e.room.id)">
              <span class="mono hall__era-id">{{ e.room.id }}</span>
              <span class="hall__era-zh">{{ e.room.titleZh }}</span>
              <span class="label hall__era-note">{{ e.room.description }}</span>
              <span class="mono hall__era-count">{{ e.room.exhibitIds.length }} 件 →</span>
            </button>
          </div>
        </div>
      </section>

      <!-- ====== 尾厅：去我的博物馆 ====== -->
      <section data-hall-section="" class="hall__section hall__outro">
        <div class="container glass-card hall__outro-card">
          <p class="label mono">MY MUSEUM</p>
          <h2 class="heading-2">你看过的一切，<br />都在你的博物馆里。</h2>
          <p class="body-md">护照记录你的探索，收藏是你的常设展。</p>
          <div class="hall__outro-actions">
            <MuseumButton to="/collection" variant="cta">MY MUSEUM · 我的博物馆</MuseumButton>
            <MuseumButton to="/timeline" variant="line">时间长廊</MuseumButton>
          </div>
        </div>
      </section>
    </div>

    <!-- ====== HUD（规范 §58：Glass 只用于导航/控件/标签）====== -->
    <div class="hall__hud" aria-hidden="false">
      <p class="hall__room label mono" aria-live="polite">{{ roomLabel }}</p>
      <div class="hall__hud-actions">
        <p class="hall__progress mono" aria-label="护照进度">{{ discovered }} / {{ totalCount }}</p>
        <button class="hall__map-btn label" @click="mapOpen = true">MAP · 地图</button>
      </div>
    </div>

    <!-- ====== 年代耳室面板（规范 §31；Teleport 脱离层叠上下文）====== -->
    <Teleport to="body">
      <div v-if="eraUi" class="era" role="dialog" aria-modal="true" :aria-label="eraUi.room.titleZh">
      <div class="era__backdrop" aria-hidden="true" @click="closeEra"></div>
      <div class="era__panel glass-card">
        <header class="era__head">
          <div>
            <p class="label mono">{{ eraUi.room.title }}</p>
            <h2 class="era__title">{{ eraUi.room.titleZh }}</h2>
            <p v-if="eraUi.room.description" class="body-md era__desc">{{ eraUi.room.description }}</p>
          </div>
          <button class="era__close" aria-label="返回走廊" @click="closeEra">✕</button>
        </header>
        <p class="label era__key">KEY EXHIBITS · 关键展品</p>
        <ul class="era__list">
          <li v-for="p in eraUi.phones" :key="p.id">
            <button class="era__row" @click="focusPhoneById(p.id)">
              <span class="mono era__year">{{ p.releaseYear }}</span>
              <PhonePhoto :phone="p" thumb class="era__photo" />
              <span class="era__name">{{ p.name }}</span>
              <span class="mono era__arrow" aria-hidden="true">→</span>
            </button>
          </li>
        </ul>
      </div>
      </div>
    </Teleport>

    <!-- ====== 展品聚焦层 ====== -->
    <ExhibitOverlay
      v-if="focused"
      :phone="focused"
      :nearby="nearby"
      @close="closeFocus"
      @navigate="onNearbyNavigate"
    />

    <!-- ====== 地图 ====== -->
    <MuseumMap
      v-if="mapOpen"
      :rooms="zones.map((z) => ({ id: z.room.id, zh: z.room.titleZh, en: z.room.title, count: z.room.exhibitIds.length, kind: z.room.kind as 'zone' | 'treasures' }))"
      :eras="eras.map((e) => ({ id: e.room.id, zh: e.room.titleZh, en: e.room.title, count: e.room.exhibitIds.length, kind: 'era' as const }))"
      :current-room="currentRoom"
      @select="onMapSelect"
      @close="mapOpen = false"
    />
  </div>
</template>

<style lang="scss" scoped>
.hall {
  // 触摸端：竖向手势滚动页面，横向手势给相机（规范 §7）
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.hall__flow {
  position: relative;
  z-index: 1;
}

.hall__section {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  padding-block: $sp-9;

  &:last-child {
    min-height: 72vh;
    min-height: 72dvh;
  }
}

// ---- 入口 ----
.hall__entrance-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $sp-4;
}

.hall__entrance-title {
  line-height: 1.02;
}

.hall__entrance-meta {
  color: $c-accent;
  font-size: 12px;
  letter-spacing: 0.3em;
}

.hall__entrance-note {
  color: $c-text-2;
  max-width: 30ch;
}

.hall__entrance-actions {
  margin-top: $sp-2;
}

.hall__entrance-skip {
  font-size: 9px;
  color: $c-text-3;
}

// ---- 主厅 ----
.hall__main-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.hall__lede {
  margin-top: $sp-3;
  max-width: 36ch;
  color: $c-text-2;
}

.hall__guide {
  margin-top: $sp-6;
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
}

.hall__guide-row {
  display: grid;
  grid-template-columns: 40px auto 1fr auto;
  gap: $sp-4;
  align-items: baseline;
  padding-block: $sp-3;
  border-top: 1px solid $c-line-soft;
  cursor: pointer;
  transition: background 0.35s var(--ease-museum);

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}

.hall__guide-index {
  font-size: 11px;
  color: $c-text-3;
}

.hall__guide-zh {
  font-size: 17px;
  font-weight: 350;
}

.hall__guide-en {
  font-size: 9px;
  color: $c-text-3;
}

.hall__guide-count {
  font-size: 10px;
  color: $c-text-3;
}

// ---- 展区 ----
.hall__zone-inner {
  width: 100%;
}

.hall__zone-title {
  margin-top: $sp-2;
}

.hall__zone-desc {
  margin-top: $sp-3;
  max-width: 34ch;
  color: $c-text-2;
}

.hall__exhibits {
  margin-top: $sp-7;
  display: flex;
  flex-direction: column;
  max-width: 640px;
}

.hall__exhibit {
  width: 100%;
  display: grid;
  grid-template-columns: 64px 44px 1fr auto;
  gap: $sp-4;
  align-items: center;
  padding: $sp-3 $sp-2;
  border-top: 1px solid $c-line-soft;
  text-align: left;
  transition: background 0.35s var(--ease-museum);

  &:hover {
    background: rgba(255, 255, 255, 0.03);

    .hall__exhibit-arrow {
      transform: translateX(5px);
      color: $c-text;
    }
  }
}

.hall__exhibit-no {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: $c-text-3;
}

.hall__exhibit-photo {
  width: 36px;
  height: 48px;
  display: flex;
  align-items: center;
}

.hall__exhibit-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hall__exhibit-name {
  font-size: 16px;
  font-weight: 350;
  word-break: keep-all;
}

.hall__exhibit-meta {
  font-size: 9px;
  color: $c-text-3;
  word-break: keep-all;
}

.hall__seen {
  font-size: 11px;
  color: $c-accent;
}

.hall__exhibit-arrow {
  color: $c-text-3;
  transition: transform 0.35s var(--ease-museum), color 0.35s var(--ease-museum);
}

// ---- 年代 ----
.hall__eras-title {
  margin-top: $sp-2;
}

.hall__era-grid {
  margin-top: $sp-7;
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include desktop {
    grid-template-columns: repeat(3, 1fr);
  }
}

.hall__era {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $sp-1;
  padding: $sp-5;
  border: 1px solid $c-line-soft;
  border-radius: 14px;
  text-align: left;
  transition: border-color 0.35s var(--ease-museum), background 0.35s var(--ease-museum);

  &:hover {
    border-color: $c-line;
    background: rgba(255, 255, 255, 0.03);
  }
}

.hall__era-id {
  font-size: 11px;
  color: $c-accent;
  letter-spacing: 0.2em;
}

.hall__era-zh {
  font-size: 18px;
  font-weight: 350;
}

.hall__era-note {
  font-size: 9px;
  color: $c-text-3;
  word-break: keep-all;
}

.hall__era-count {
  margin-top: $sp-2;
  font-size: 10px;
  color: $c-text-2;
}

// ---- 尾厅 ----
.hall__outro-card {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $sp-3;
  padding: $sp-7 $sp-6;
}

.hall__outro-actions {
  margin-top: $sp-3;
  display: flex;
  gap: $sp-3;
  flex-wrap: wrap;
}

// ---- HUD ----
.hall__hud {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(#{$sp-3} + env(safe-area-inset-bottom) + 64px);
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: $sp-4;
  pointer-events: none;

  @include desktop {
    bottom: $sp-5;
    padding-inline: $page-pad-x;
  }
}

.hall__room {
  font-size: 9px;
  color: $c-text-2;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.55);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  word-break: keep-all;
}

.hall__hud-actions {
  display: flex;
  align-items: center;
  gap: $sp-2;
  pointer-events: auto;
}

.hall__progress {
  font-size: 10px;
  color: $c-text-2;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.hall__map-btn {
  font-size: 9px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: $c-text;
  background: rgba(10, 10, 10, 0.55);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  transition: border-color 0.3s var(--ease-museum);

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }
}

.hall__cursor {
  position: fixed;
  z-index: 31;
  pointer-events: none;
  font-size: 9px;
  color: $c-text-2;
}

// ---- 年代耳室面板 ----
.era {
  position: fixed;
  inset: 0;
  z-index: 60;

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(4, 4, 4, 0.62);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
  }

  &__panel {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 84dvh;
    border-radius: 22px 22px 0 0;
    background: rgba(12, 12, 12, 0.85);
    padding: $sp-5 $sp-5 $sp-6;
    overflow-y: auto;

    @include desktop {
      left: $sp-6;
      right: auto;
      top: 50%;
      bottom: auto;
      transform: translateY(-50%);
      width: min(460px, 40vw);
      border-radius: 18px;
    }
  }

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $sp-4;
  }

  &__title {
    margin-top: $sp-1;
    font-size: clamp(26px, 4vw, 38px);
    font-weight: 250;
  }

  &__desc {
    margin-top: $sp-2;
    color: $c-text-2;
  }

  &__close {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border: 1px solid $c-line-soft;
    border-radius: 50%;
    color: $c-text-2;

    &:hover {
      color: $c-text;
      border-color: $c-line;
    }
  }

  &__key {
    margin-top: $sp-5;
    font-size: 10px;
    color: $c-text-3;
  }

  &__list {
    margin-top: $sp-2;
  }

  &__row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-2 0;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    text-align: left;

    &:hover .era__arrow {
      transform: translateX(4px);
      color: $c-text;
    }
  }

  &__year {
    width: 40px;
    font-size: 12px;
    color: $c-text-3;
    flex-shrink: 0;
  }

  &__photo {
    width: 34px;
    height: 44px;
    flex-shrink: 0;
  }

  &__name {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__arrow {
    margin-left: auto;
    color: $c-text-3;
    transition: transform 0.3s var(--ease-museum), color 0.3s var(--ease-museum);
  }
}
</style>
