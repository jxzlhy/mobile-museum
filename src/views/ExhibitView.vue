<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Stage } from '@/three/core/Stage'
import { ExhibitScene } from '@/three/scenes/ExhibitScene'
import { exhibitService, type Exhibit } from '@/services/exhibitService'
import { museumService, type NearbyExhibit } from '@/services/museumService'
import { phoneService } from '@/services/phoneService'
import { memoryService } from '@/services/memoryService'
import { discoveryService } from '@/services/discoveryService'
import { useMuseum } from '@/composables/useMuseum'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useDevice } from '@/composables/useDevice'
import { useCollection } from '@/composables/useCollection'
import { getSmoothScroll } from '@/composables/useSmoothScroll'
import { resolvePhoneImage } from '@/data/assets'
import { formFactorLabel } from '@/data/formFactors'
import type { ExplodedPartSpec, MaterialInfo, ExhibitDetailSpec } from '@/data/exhibits'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import ExhibitRealDevice from '@/components/exhibit/ExhibitRealDevice.vue'
import ExhibitStructure from '@/components/exhibit/ExhibitStructure.vue'
import ExhibitMaterial from '@/components/exhibit/ExhibitMaterial.vue'
import ExhibitAudio from '@/components/exhibit/ExhibitAudio.vue'
import ExhibitSource from '@/components/exhibit/ExhibitSource.vue'
import AddToExhibition from '@/components/curator/AddToExhibition.vue'

// ============================================================
// Exhibit View（V0.5 规范 §4 / §41）：
// 同一件展品的不同观察方式 —— REAL DEVICE / 3D / STRUCTURE /
// MATERIAL / DETAIL。能力驱动（§29）：不存在的模式不出入口。
// URL 状态刷新可恢复（?mode=&part=，§41）。
// ============================================================

const route = useRoute()
const router = useRouter()
const museum = useMuseum()
const reduced = useReducedMotion()
const { isDesktop } = useDevice()
const { hasPhone, togglePhone } = useCollection()

const exhibit = ref<Exhibit | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')

type ExhibitMode = 'real' | '3d' | 'structure' | 'material' | 'detail'
const mode = ref<ExhibitMode>('real')
const has3d = ref(false)

// ---- 场景 ----
const heroEl = ref<HTMLElement>()
let scene: ExhibitScene | null = null

// ---- 交互状态 ----
const explodeT = ref(0)
const activePartId = ref<string | null>(null)
const activeMaterialId = ref<string | null>(null)
const activeDetailId = ref<string | null>(null)
const partSheetOpen = ref(false)
const sheetInfo = ref<{ title: string; sub?: string; description?: string } | null>(null)
const autoRotate = ref(false)

// ---- 相邻 / 收藏 / 策展 ----
const nextExhibit = ref<{ phone: { id: string; name: string }; nearby?: NearbyExhibit } | null>(null)

const parts = computed<ExplodedPartSpec[]>(() => exhibit.value?.content?.parts ?? [])
const materials = computed<MaterialInfo[]>(() => exhibit.value?.content?.materials ?? [])
const details = computed<ExhibitDetailSpec[]>(() => exhibit.value?.content?.details ?? [])
const audio = computed(() => exhibit.value?.content?.audio ?? null)

/** 能力驱动的模式列表（§29 / §52：不存在就不显示）。 */
const modes = computed<Array<{ id: ExhibitMode; en: string; zh: string }>>(() => {
  const c = exhibit.value?.capabilities
  if (!c) return []
  const list: Array<{ id: ExhibitMode; en: string; zh: string }> = []
  if (c.realPhoto || !c.model3d) list.push({ id: 'real', en: 'REAL DEVICE', zh: '实拍' })
  if (c.model3d) list.push({ id: '3d', en: '3D VIEW', zh: '3D' })
  if (c.structure) list.push({ id: 'structure', en: 'STRUCTURE', zh: '结构' })
  if (c.material) list.push({ id: 'material', en: 'MATERIAL', zh: '材料' })
  if (c.detail) list.push({ id: 'detail', en: 'DETAIL', zh: '细节' })
  return list
})

const heroPhoto = computed(() =>
  exhibit.value ? Boolean(resolvePhoneImage(exhibit.value.phone, 'hero')) : false,
)

// ============================================================
// 加载
// ============================================================

async function load() {
  status.value = 'loading'
  const id = String(route.params.id ?? '')
  const ex = await exhibitService.getExhibit(id)
  if (!ex) {
    status.value = 'error'
    document.title = '展品未找到 — 手机历史博物馆'
    return
  }
  exhibit.value = ex
  status.value = 'ready'
  document.title = `${ex.phone.name} · 深度观展 — 手机历史博物馆`

  // 参观记录（§25）与发现（V0.4 §40）——两类状态严格分离
  memoryService.visit(ex.phone.id)
  discoveryService.discover(ex.phone.id, ex.phone.exhibitLevel === 3 ? 'treasure' : 'view')

  await computeNext(ex.phone.id)

  // 3D 场景（§49：主模型仅当前展品；结构模型即当前模型的部件注册）
  if (ex.capabilities.model3d && museum.state.webgl) {
    try {
      scene = new ExhibitScene(ex.phone.model!, { reduced: reduced.value })
      await Stage.setScene(scene)
      has3d.value = true
      if (import.meta.env.DEV) {
        ;(window as unknown as Record<string, unknown>).__exhibitScene = scene
      }
    } catch (err) {
      console.error('[ExhibitView] 3D 加载失败，回退实拍（规范 §51）', err)
      has3d.value = false
    }
  } else {
    Stage.clearScene()
    has3d.value = false
  }

  // URL 恢复（§41）：?mode=&part=
  const qMode = String(route.query.mode ?? '') as ExhibitMode
  if (qMode && modes.value.some((m) => m.id === qMode)) {
    mode.value = qMode
  } else {
    mode.value = heroPhoto.value ? 'real' : has3d.value ? '3d' : 'real'
  }
  await nextTick()
  const qPart = route.query.part ? String(route.query.part) : null
  if (qPart && (qMode === 'structure' || qMode === 'material' || qMode === 'detail')) {
    void focusEntry(qMode, qPart)
  }
}

/** NEXT EXHIBIT（§43）：same story → same brand → same era → nearby。 */
async function computeNext(phoneId: string) {
  const nearby = await museumService.getNearbyExhibits(phoneId, 8)
  const rank = (r: NearbyExhibit) =>
    r.relation === 'same-story' ? 0 : r.relation === 'same-brand' ? 1 : r.relation === 'same-era' ? 2 : 3
  const storyFirst = [...nearby].sort((a, b) => rank(a) - rank(b))
  const pick = storyFirst[0]
  nextExhibit.value = pick ? { phone: pick.phone, nearby: pick } : null
}

onMounted(load)

onUnmounted(() => {
  scene?.dispose()
  scene = null
  Stage.clearScene()
})

watch(
  () => route.params.id,
  (id, old) => {
    if (id && id !== old && route.name === 'exhibit') {
      scene?.dispose()
      scene = null
      has3d.value = false
      activePartId.value = activeMaterialId.value = activeDetailId.value = null
      explodeT.value = 0
      void load()
    }
  },
)

// ============================================================
// 模式与 URL（§41）
// ============================================================

function setMode(m: ExhibitMode) {
  mode.value = m
  if (m === 'structure') {
    // 结构模式默认展开 50%，给一个直观的第一眼（§9）
    if (explodeT.value === 0) {
      explodeT.value = 0.5
      scene?.setExplode(0.5)
    }
    scene?.presentStructure()
  }
  if (m === '3d') scene?.resetView()
  syncQuery()
}

function syncQuery() {
  const q: Record<string, string> = {}
  if (mode.value !== 'real') q.mode = mode.value
  if (activePartId.value && mode.value === 'structure') q.part = activePartId.value
  if (activeMaterialId.value && mode.value === 'material') q.part = activeMaterialId.value
  if (activeDetailId.value && mode.value === 'detail') q.part = activeDetailId.value
  const changed = Object.keys(q).some((k) => String(route.query[k] ?? '') !== q[k])
    || Object.keys(route.query).some((k) => (k === 'mode' || k === 'part') && q[k] === undefined)
  if (changed) router.replace({ query: q })
}

// ============================================================
// 画布交互（§44 / §45）
// ============================================================

let lastX = 0
let lastY = 0
let downX = 0
let downY = 0
let dragged = false
const pointers = new Map<number, { x: number; y: number }>()
let pinchDist = 0

function onPointerDown(e: PointerEvent) {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
    return
  }
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  lastX = downX = e.clientX
  lastY = downY = e.clientY
  dragged = false
}

function onPointerMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (pinchDist > 0 && scene) scene.zoomBy((d - pinchDist) * 0.02)
    pinchDist = d
    dragged = true
    return
  }
  if (!(e.buttons & 1)) return
  const dx = e.clientX - lastX
  if (!dragged && Math.hypot(e.clientX - downX, e.clientY - downY) > 6) dragged = true
  if (dragged && scene) scene.dragBy(dx)
  lastX = e.clientX
  lastY = e.clientY
}

function onPointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchDist = 0
  scene?.endDrag()
  if (!dragged && scene) {
    const hit = scene.pick((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    if (hit) {
      const part = parts.value.find((p) => p.modelNode === hit || p.id === hit)
      if (part) void focusPart(part.id)
    }
  }
}

function onWheel(e: WheelEvent) {
  if (!scene) return
  e.preventDefault()
  scene.zoomBy(e.deltaY * 0.004)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeSheet()
}

// ============================================================
// 结构 / 材料 / 细节聚焦（§11 / §12 / §13）
// ============================================================

function onScrub(t: number) {
  explodeT.value = t
  scene?.setExplode(t)
}

async function focusPart(partId: string) {
  const part = parts.value.find((p) => p.id === partId)
  if (!part || !scene) return
  activePartId.value = partId
  partSheetOpen.value = true
  sheetInfo.value = { title: part.name, description: part.description }
  syncQuery()
  await scene.focusNode(part.id, part.modelNode ?? part.id)
}

async function selectMaterial(id: string) {
  const m = materials.value.find((v) => v.id === id)
  if (!m || !scene) {
    activeMaterialId.value = id
    return
  }
  activeMaterialId.value = id
  sheetInfo.value = { title: m.name, sub: 'MATERIAL', description: m.reason ?? m.description }
  partSheetOpen.value = true
  syncQuery()
  // 高亮全部相关部件（§36：克制）
  scene.clearHighlight()
  for (const cid of m.componentIds) scene.highlightNode(cid)
  const first = m.componentIds.find((c) => scene!.nodeNames.includes(c))
  if (first) await scene.focusNode(first)
}

async function selectDetail(id: string) {
  const d = details.value.find((v) => v.id === id)
  if (!d) return
  activeDetailId.value = id
  sheetInfo.value = { title: d.name, sub: 'DETAIL', description: d.description }
  if (d.partId && scene) {
    partSheetOpen.value = true
    syncQuery()
    await scene.focusNode(d.partId)
  } else {
    partSheetOpen.value = false
  }
}

/** URL 直达（?mode=structure&part=antenna）。 */
async function focusEntry(m: ExhibitMode, partId: string) {
  if (m === 'structure') {
    scene?.presentStructure()
    await focusPart(partId)
  } else if (m === 'material') await selectMaterial(partId)
  else if (m === 'detail') await selectDetail(partId)
}

function closeSheet() {
  partSheetOpen.value = false
  sheetInfo.value = null
  activePartId.value = null
  void scene?.resetView()
}

function toggleAutoRotate() {
  autoRotate.value = !autoRotate.value
  scene?.setAutoRotate(autoRotate.value)
}

function resetView() {
  closeSheet()
  explodeT.value = 0
  scene?.setExplode(0)
  scene?.resetView()
}

// ============================================================
// 收藏 / 策展 / 音频
// ============================================================

const inCollection = computed(() => (exhibit.value ? hasPhone(exhibit.value.phone.id) : false))

// reduced motion 切换同步到场景（§47）
watch(reduced, () => {
  scene?.setReduced(reduced.value)
})
</script>

<template>
  <div class="exhibit-page">
    <!-- 未找到 -->
    <section v-if="status === 'error'" class="exhibit-page__missing container">
      <div class="glass-card missing-card">
        <p class="label">展品未找到</p>
        <h1 class="heading-1" style="margin-block: 24px">这座展柜<br />空空如也。</h1>
        <MuseumButton to="/museum">返回博物馆</MuseumButton>
      </div>
    </section>

    <p v-else-if="status === 'loading'" class="label container" style="padding-block: 160px">
      LOADING EXHIBIT · 正在开启展柜……
    </p>

    <template v-else-if="exhibit">
      <!-- ====== HERO：3D / 结构观察区 ====== -->
      <section class="exhibit-hero">
        <!-- 3D 可用：画布交互层（REAL DEVICE 模式下由图库盖住画布） -->
        <div
          v-if="has3d && mode !== 'real'"
          class="exhibit-hero__drag"
          data-cursor="拖拽"
          aria-hidden="true"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel="onWheel"
        ></div>

        <!-- REAL DEVICE 模式：实拍图库为展品本体 -->
        <div v-if="mode === 'real'" class="exhibit-hero__real container">
          <ExhibitRealDevice v-if="heroPhoto" :phone="exhibit.phone" />
          <div v-else class="exhibit-hero__unavailable">
            <p class="label">IMAGE UNAVAILABLE · 图版待补</p>
            <p class="body-md">这座展品的实拍图版仍在筹备，试试 3D 视图。</p>
          </div>
        </div>

        <!-- 部件浮层标签（桌面）/ 底部说明（移动） -->
        <transition name="sheet">
          <aside v-if="partSheetOpen && sheetInfo" class="exhibit-hero__sheet glass-card" role="status">
            <header class="exhibit-hero__sheet-head">
              <p v-if="sheetInfo.sub" class="label mono exhibit-hero__sheet-sub">{{ sheetInfo.sub }}</p>
              <button class="exhibit-hero__sheet-close" aria-label="收起" @click="closeSheet">✕</button>
            </header>
            <h3 class="exhibit-hero__sheet-title">{{ sheetInfo.title }}</h3>
            <p v-if="sheetInfo.description" class="body-md exhibit-hero__sheet-desc">{{ sheetInfo.description }}</p>
            <p v-else class="mono exhibit-hero__sheet-nodata">NOT DOCUMENTED</p>
          </aside>
        </transition>

        <!-- 结构模式下部的部件名提示（3D 标签 dot+line+label 由展签列表承担） -->
        <p v-if="mode === 'structure'" class="exhibit-hero__hint label" aria-hidden="true">
          拖动 EXPLODE 滑杆 · 点击部件或右侧清单
        </p>
      </section>

      <!-- ====== 展签头 ====== -->
      <section class="exhibit-head container">
        <div class="exhibit-head__meta">
          <p v-if="exhibit.phone.exhibitNo" class="mono exhibit-head__no">{{ exhibit.phone.exhibitNo }}</p>
          <p class="exhibit-head__year mono">{{ exhibit.phone.releaseYear }}</p>
          <h1 class="exhibit-head__name">{{ exhibit.phone.name }}</h1>
          <p v-if="exhibit.phone.tagline" class="exhibit-head__tagline body-lg">{{ exhibit.phone.tagline }}</p>
          <p class="label exhibit-head__brand">
            {{ exhibit.phone.brandName }}<template v-if="exhibit.phone.formFactor"> · {{ formFactorLabel(exhibit.phone.formFactor) }}</template>
          </p>
        </div>
        <div class="exhibit-head__actions">
          <button class="exhibit-head__collect" :class="{ 'exhibit-head__collect--on': inCollection }" @click="togglePhone(exhibit.phone.id)">
            <span>{{ inCollection ? '✓' : '♡' }}</span>
            <span>{{ inCollection ? '已收藏' : '收藏' }}</span>
          </button>
        </div>
      </section>

      <!-- ====== 模式切换（能力驱动，§4 / §29）====== -->
      <nav class="exhibit-modes" :class="{ 'exhibit-modes--desktop': isDesktop }" aria-label="观察方式">
        <button
          v-for="m in modes"
          :key="m.id"
          class="exhibit-modes__btn"
          :class="{ 'exhibit-modes__btn--on': mode === m.id }"
          @click="setMode(m.id)"
        >
          {{ m.en }}
        </button>
        <span v-if="has3d && mode !== 'real'" class="exhibit-modes__extra">
          <button class="exhibit-modes__mini" :aria-pressed="autoRotate" @click="toggleAutoRotate">
            {{ autoRotate ? 'AUTO ON' : 'AUTO OFF' }}
          </button>
          <button class="exhibit-modes__mini" @click="resetView">RESET</button>
        </span>
      </nav>

      <!-- ====== 内容面板 ====== -->
      <section class="exhibit-panel container">
        <!-- LISTEN（§16）：只预置音频，点击播放 -->
        <div v-if="audio" class="exhibit-panel__audio">
          <p class="label exhibit-panel__listen"><span class="mono">LISTEN · {{ audio.title }}</span></p>
          <ExhibitAudio :guide="audio" />
        </div>

        <div v-if="mode === 'structure' && parts.length" class="exhibit-panel__body">
          <ExhibitStructure
            :parts="parts"
            :active-part-id="activePartId"
            :explode="explodeT"
            @scrub="onScrub"
            @select="focusPart"
          />
        </div>

        <div v-else-if="mode === 'material' && materials.length" class="exhibit-panel__body">
          <ExhibitMaterial
            :materials="materials"
            :active-material-id="activeMaterialId"
            @select="selectMaterial"
          />
        </div>

        <div v-else-if="mode === 'detail' && details.length" class="exhibit-panel__body">
          <ul class="exhibit-details">
            <li v-for="d in details" :key="d.id">
              <button class="exhibit-details__row" :class="{ 'exhibit-details__row--on': activeDetailId === d.id }" @click="selectDetail(d.id)">
                <span class="exhibit-details__name">{{ d.name }}</span>
                <span class="mono exhibit-details__arrow" aria-hidden="true">→</span>
              </button>
            </li>
          </ul>
        </div>

        <div v-else-if="mode === '3d'" class="exhibit-panel__body exhibit-panel__body--hint">
          <p class="body-md">拖拽旋转 · 滚轮 / 双指缩放 · AUTO 可开启缓慢展示旋转。</p>
        </div>
      </section>

      <!-- ====== 展签正文（故事 / 快速事实）====== -->
      <section class="exhibit-story container">
        <dl v-if="exhibit.phone.specs" class="exhibit-story__facts">
          <div v-if="exhibit.phone.specs.weight" class="exhibit-story__fact">
            <dt class="label">重量</dt>
            <dd class="mono">{{ exhibit.phone.specs.weight }} g</dd>
          </div>
          <div v-if="exhibit.phone.specs.displaySize" class="exhibit-story__fact">
            <dt class="label">屏幕</dt>
            <dd class="mono">{{ exhibit.phone.specs.displaySize }}"</dd>
          </div>
          <div v-if="exhibit.phone.specs.network?.length" class="exhibit-story__fact">
            <dt class="label">网络</dt>
            <dd class="mono">{{ exhibit.phone.specs.network.join(' · ') }}</dd>
          </div>
        </dl>

        <p v-if="exhibit.phone.story" class="body-md exhibit-story__text">{{ exhibit.phone.story }}</p>
        <p v-if="exhibit.phone.significance" class="exhibit-story__quote">{{ exhibit.phone.significance }}</p>

        <ExhibitSource :phone="exhibit.phone" class="exhibit-story__source" />
      </section>

      <!-- ====== 加入个人展览（V0.8 §66：→ Curator Studio）====== -->
      <section class="exhibit-curate container glass-card">
        <AddToExhibition
          block-type="exhibit"
          :block-data="() => ({ phoneId: exhibit!.phone.id, displayMode: 'photo' })"
          label="MY EXHIBITION · 加入个人展览"
        />
        <p class="label exhibit-curate__hint">在 CURATOR STUDIO 里排序、注释并分享你的展览。</p>
      </section>

      <!-- ====== 返回 / 下一件（§42 / §43 + V0.6 §39 关系图谱）====== -->
      <nav class="exhibit-pager container" aria-label="展品导航">
        <MuseumButton variant="line" @click="router.back()">← BACK TO MUSEUM</MuseumButton>
        <div class="exhibit-pager__links">
          <router-link class="exhibit-pager__graph label" :to="`/explore/graph?focus=phone:${exhibit.phone.id}`">
            EXPLORE RELATIONS · 关系图谱 →
          </router-link>
          <router-link class="exhibit-pager__graph label" :to="`/explore/context/${exhibit.phone.releaseYear}`">
            CONTEXT · {{ exhibit.phone.releaseYear }} 时代环境 →
          </router-link>
        </div>
        <router-link
          v-if="nextExhibit"
          :to="`/museum/exhibit/${nextExhibit.phone.id}`"
          class="exhibit-pager__next"
          data-cursor="下一件"
        >
          <span class="label">NEXT EXHIBIT</span>
          <span class="exhibit-pager__name">{{ nextExhibit.phone.name }} →</span>
        </router-link>
      </nav>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.exhibit-page {
  padding-top: calc(64px + env(safe-area-inset-top));
  padding-bottom: $sp-9;

  &__missing {
    padding-block: 120px;
  }
}

.missing-card {
  padding: $sp-8 $sp-6;
}

// ---- HERO ----
.exhibit-hero {
  position: relative;
  height: 62vh;
  height: 62dvh;
  min-height: 380px;

  @include desktop {
    height: 68vh;
    height: 68dvh;
  }

  &__drag {
    position: absolute;
    inset: 0;
    touch-action: pan-y;
    cursor: grab;
    z-index: 1;

    &:active {
      cursor: grabbing;
    }
  }

  &__real {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    align-items: center;
    background: rgba(8, 8, 8, 0.55);
  }

  &__unavailable {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-2;

    .label {
      font-size: 10px;
      color: $c-text-3;
    }

    .body-md {
      color: $c-text-2;
    }
  }

  &__hint {
    position: absolute;
    left: $page-pad-x;
    bottom: $sp-3;
    z-index: 2;
    font-size: 9px;
    color: $c-text-3;
  }

  &__sheet {
    position: absolute;
    left: $sp-4;
    right: $sp-4;
    bottom: $sp-4;
    z-index: 3;
    padding: $sp-4 $sp-5;
    background: rgba(12, 12, 12, 0.85);

    @include desktop {
      left: auto;
      right: $page-pad-x;
      bottom: $sp-5;
      width: min(360px, 34vw);
    }
  }

  &__sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__sheet-sub {
    font-size: 9px;
    color: $c-accent;
    letter-spacing: 0.22em;
  }

  &__sheet-close {
    width: 28px;
    height: 28px;
    border: 1px solid $c-line-soft;
    border-radius: 50%;
    color: $c-text-3;
    font-size: 12px;

    &:hover {
      color: $c-text;
    }
  }

  &__sheet-title {
    margin-top: $sp-1;
    font-size: 22px;
    font-weight: 300;
    word-break: keep-all;
  }

  &__sheet-desc {
    margin-top: $sp-2;
    color: $c-text-2;
    line-height: 1.7;
  }

  &__sheet-nodata {
    margin-top: $sp-2;
    font-size: 10px;
    letter-spacing: 0.2em;
    color: $c-text-3;
  }
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s var(--ease-museum), transform 0.3s var(--ease-museum);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

// ---- 展签头 ----
.exhibit-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: $sp-5;
  padding-block: $sp-6 $sp-4;
  flex-wrap: wrap;

  &__no {
    font-size: 10px;
    letter-spacing: 0.3em;
    color: $c-accent;
  }

  &__year {
    margin-top: $sp-2;
    font-size: 13px;
    letter-spacing: 0.25em;
    color: $c-text-2;
  }

  &__name {
    margin-top: $sp-1;
    font-size: clamp(30px, 5.4vw, 56px);
    font-weight: 250;
    line-height: 1.08;
    word-break: keep-all;
  }

  &__tagline {
    margin-top: $sp-3;
    color: $c-text-2;
  }

  &__brand {
    margin-top: $sp-2;
    font-size: 10px;
  }

  &__collect {
    display: inline-flex;
    align-items: center;
    gap: $sp-2;
    padding: $sp-3 $sp-5;
    border: 1px solid $c-line;
    border-radius: 999px;
    color: $c-text;
    @include label-style(12px);
    letter-spacing: 0.16em;
    transition: border-color 0.3s var(--ease-museum), color 0.3s var(--ease-museum);

    &--on {
      border-color: rgba(184, 178, 164, 0.55);
      color: $c-accent;
    }
  }
}

// ---- 模式切换（§4：同一件展品的不同观察方式）----
.exhibit-modes {
  position: sticky;
  top: calc(64px + env(safe-area-inset-top));
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  margin-inline: $sp-4;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.72);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  overflow-x: auto;

  @include desktop {
    margin-inline: auto;
    width: fit-content;
  }

  &__btn {
    @include label-style(10px);
    letter-spacing: 0.1em;
    padding: 9px 16px;
    border-radius: 999px;
    color: $c-text-3;
    white-space: nowrap;
    transition: color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

    &--on {
      color: #0a0a0a;
      background: rgba(255, 255, 255, 0.9);
    }
  }

  &__extra {
    display: inline-flex;
    gap: 4px;
    margin-left: $sp-2;
  }

  &__mini {
    @include label-style(9px);
    padding: 8px 12px;
    border-radius: 999px;
    color: $c-text-3;
    border: 1px solid rgba(255, 255, 255, 0.1);
    white-space: nowrap;

    &:hover {
      color: $c-text;
    }
  }
}

// ---- 内容面板 ----
.exhibit-panel {
  padding-block: $sp-5 $sp-2;

  &__audio {
    margin-bottom: $sp-5;
  }

  &__listen {
    font-size: 10px;
    margin-bottom: $sp-2;

    .mono {
      color: $c-accent;
      letter-spacing: 0.18em;
    }
  }

  &__body--hint {
    color: $c-text-3;
  }
}

// ---- 细节清单 ----
.exhibit-details {
  display: flex;
  flex-direction: column;

  &__row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-3 $sp-2;
    border-top: 1px solid $c-line-soft;
    text-align: left;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    &--on {
      .exhibit-details__name {
        color: $c-accent;
      }
    }
  }

  &__name {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__arrow {
    margin-left: auto;
    color: $c-text-3;
  }
}

// ---- 故事 ----
.exhibit-story {
  padding-block: $sp-5;

  &__facts {
    display: flex;
    gap: $sp-6;
    flex-wrap: wrap;
    padding: $sp-4 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
  }

  &__fact {
    dd {
      margin-top: 2px;
      font-size: 14px;
      word-break: keep-all;
    }
  }

  &__text {
    margin-top: $sp-5;
    max-width: 68ch;
    color: $c-text-2;
    line-height: 1.85;
  }

  &__quote {
    margin-top: $sp-5;
    font-size: clamp(20px, 3vw, 32px);
    font-weight: 250;
    line-height: 1.4;
    border-left: 2px solid $c-accent;
    padding-left: $sp-4;
    max-width: 30ch;
    word-break: keep-all;
  }

  &__source {
    margin-top: $sp-6;
  }
}

// ---- 加入个人展览 ----
.exhibit-curate {
  margin-top: $sp-6;
  padding: $sp-5;

  &__row {
    margin-top: $sp-3;
    display: flex;
    gap: $sp-2;
  }

  &__select {
    flex: 1;
    padding: $sp-3 $sp-4;
    border-radius: 12px;
    border: 1px solid $c-line-soft;
    background: rgba(255, 255, 255, 0.04);
    color: $c-text;
    font-size: 13px;
  }

  &__add {
    padding: $sp-3 $sp-5;
    border-radius: 12px;
    border: 1px solid rgba(184, 178, 164, 0.5);
    color: $c-accent;
    @include label-style(11px);

    &:disabled {
      opacity: 0.35;
    }

    &:hover:not(:disabled) {
      background: rgba(184, 178, 164, 0.1);
    }
  }

  &__flash {
    margin-top: $sp-2;
    font-size: 10px;
    color: $c-accent;
  }

  &__hint {
    margin-top: $sp-2;
    font-size: 9px;
    color: $c-text-3;
  }
}

// ---- 返回 / 下一件 ----
.exhibit-pager {
  margin-top: $sp-7;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: $sp-3;
  flex-wrap: wrap;

  &__links {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-2;
  }

  &__graph {
    color: $c-text-2;
    word-break: keep-all;

    &:hover {
      color: $c-accent;
    }
  }

  &__next {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: $sp-1;
    padding: $sp-4 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
    transition: border-color 0.3s var(--ease-museum);

    .label {
      font-size: 9px;
      color: $c-text-3;
    }

    &:hover {
      border-color: $c-line;
    }
  }

  &__name {
    font-size: 16px;
    font-weight: 350;
    word-break: keep-all;
  }
}
</style>
