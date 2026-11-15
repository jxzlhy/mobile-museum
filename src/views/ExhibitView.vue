<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Stage } from '@/three/core/Stage'
import { ExhibitScene } from '@/three/scenes/ExhibitScene'
import { exhibitService, type Exhibit } from '@/services/exhibitService'
import { museumService, type NearbyExhibit } from '@/services/museumService'
import { memoryService } from '@/services/memoryService'
import { discoveryService } from '@/services/discoveryService'
import { useMuseum } from '@/composables/useMuseum'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { resolvePhoneImage } from '@/data/assets'
import type { ExplodedPartSpec, MaterialInfo, ExhibitDetailSpec } from '@/data/exhibits'
import MuseumButton from '@/components/common/MuseumButton.vue'
import ExhibitRealDevice from '@/components/exhibit/ExhibitRealDevice.vue'
import ExhibitStructure from '@/components/exhibit/ExhibitStructure.vue'
import ExhibitMaterial from '@/components/exhibit/ExhibitMaterial.vue'
import ExhibitAudio from '@/components/exhibit/ExhibitAudio.vue'
import ExhibitHead from '@/components/exhibit/ExhibitHead.vue'
import ExhibitModeSwitch from '@/components/exhibit/ExhibitModeSwitch.vue'
import ExhibitStory from '@/components/exhibit/ExhibitStory.vue'
import ExhibitPager from '@/components/exhibit/ExhibitPager.vue'
import AddToExhibition from '@/components/curator/AddToExhibition.vue'

// ============================================================
// Exhibit View（V0.5 规范 §4 / §41）：
// 同一件展品的不同观察方式 —— REAL DEVICE / 3D / STRUCTURE /
// MATERIAL / DETAIL。能力驱动（§29）：不存在的模式不出入口。
// URL 状态刷新可恢复（?mode=&part=，§41）。
// 视图只保留 3D 场景与交互编排；展签头/模式切换/展签正文/页脚
// 拆分在 components/exhibit/。
// ============================================================

const route = useRoute()
const router = useRouter()
const museum = useMuseum()
const reduced = useReducedMotion()

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

// ---- 相邻 ----
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

/** 模式切换组件回传 string，这里收窄为合法模式（能力列表保证来源合法）。 */
function onModeChange(id: string) {
  setMode(id as ExhibitMode)
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

// reduced motion 切换同步到场景（§47）
watch(reduced, () => {
  scene?.setReduced(reduced.value)
})

// Escape 收起部件浮层（§45）
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
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
      <ExhibitHead :phone="exhibit.phone" />

      <!-- ====== 模式切换（能力驱动，§4 / §29）====== -->
      <ExhibitModeSwitch
        :modes="modes"
        :model-value="mode"
        :has3d="has3d"
        :auto-rotate="autoRotate"
        @update:model-value="onModeChange"
        @toggle-auto="toggleAutoRotate"
        @reset="resetView"
      />

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
      <ExhibitStory :phone="exhibit.phone" />

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
      <ExhibitPager
        :phone-id="exhibit.phone.id"
        :release-year="exhibit.phone.releaseYear"
        :next="nextExhibit?.phone ?? null"
      />
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

// ---- 加入个人展览 ----
.exhibit-curate {
  margin-top: $sp-6;
  padding: $sp-5;

  &__hint {
    margin-top: $sp-2;
    font-size: 9px;
    color: $c-text-3;
  }
}
</style>
