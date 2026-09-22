<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Stage } from '@/three/core/Stage'
import { TimeMachineScene } from '@/three/scenes/TimeMachineScene'
import { timeMachineService, type SceneView } from '@/services/timeMachineService'
import { sceneService } from '@/services/sceneService'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useMuseum } from '@/composables/useMuseum'
import { discoveryService } from '@/services/discoveryService'
import { getTechnologyMomentsData } from '@/data/scenes'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import AddToExhibition from '@/components/curator/AddToExhibition.vue'

// Historical Scene（V0.7 规范 §41–§50 / §67 / §79 / §85–§87 / §90–§95）：
// 3D 场景（Hero + 相关设备 + 抽象技术标记）+ 章节 + THEN/NOW +
// TECHNOLOGY MOMENT + CULTURE + WHAT CHANGED + NEXT ERA。
// 场景不是唯一信息通道 —— 全部内容有 DOM 文本（§82）。

const route = useRoute()
const router = useRouter()
const reduced = useReducedMotion()
const museum = useMuseum()

const sv = ref<SceneView | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const has3d = ref(false)
const focusInfo = ref<{ title: string; sub: string } | null>(null)
const sourceOpen = ref(false)

let scene: TimeMachineScene | null = null
let dragged = false

const year = computed(() => Number(route.params.year))

const ACCURACY_LABEL: Record<string, string> = {
  documented: 'DOCUMENTED · 有直接资料支持',
  curated: 'CURATED · 策展组合',
  abstract: 'ABSTRACT · 抽象表达',
}

async function load() {
  status.value = 'loading'
  const view = await timeMachineService.getScene(year.value)
  if (!view) {
    status.value = 'error'
    document.title = '场景未找到 — 手机历史博物馆'
    return
  }
  sv.value = view
  status.value = 'ready'
  document.title = `Mobile Museum — ${view.scene.year} · ${view.scene.titleZh}`

  // 场景访问记录（§52 / §55）+ 复用发现机制（§97：发现 Hero 展品）
  void timeMachineService.recordVisit(year.value)
  if (view.hero) discoveryService.discover(view.hero.id, 'view')

  // 3D 场景（§34：Hero 先行；§35：预算内）
  if (museum.state.webgl) {
    try {
      scene = new TimeMachineScene({
        scene: view.scene,
        hero: view.hero,
        related: view.objects
          .filter((o) => o.phone && o.object.id !== 'hero')
          .map((o) => ({
            phone: o.phone!,
            position: o.object.position ?? { x: -2, y: 0.7, z: -1.5 },
            scale: o.object.scale ?? 0.95,
          })),
        reduced: reduced.value,
      })
      await Stage.setScene(scene)
      has3d.value = true
      if (import.meta.env.DEV) {
        ;(window as unknown as Record<string, unknown>).__tmScene = scene
      }
    } catch (err) {
      console.error('[TimeMachine] 3D 场景构建失败，降级为 Era Snapshot（规范 §87）', err)
      has3d.value = false
    }
  }

  await nextTick()
  window.scrollTo(0, 0)
}

onMounted(load)
onUnmounted(() => {
  scene = null
  Stage.clearScene()
})

watch(
  () => route.params.year,
  (y, old) => {
    if (y && y !== old && route.name === 'time-machine-scene') {
      scene?.dispose()
      scene = null
      has3d.value = false
      void load()
    }
  },
)

watch(reduced, () => {
  // §83：reduced motion 相机直接定位
  scene?.setReduced(reduced.value)
})

// ---- 场景交互（§28–§31）----
let downX = 0
let downY = 0

function onPointerDown(e: PointerEvent) {
  const target = e.target as HTMLElement
  if (target.closest('button, a')) return
  downX = e.clientX
  downY = e.clientY
  dragged = false
}
function onPointerMove(e: PointerEvent) {
  if (!(e.buttons & 1) || !scene) return
  if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) dragged = true
  if (dragged) scene.dragBy(e.movementX)
}
function onPointerUp(e: PointerEvent) {
  if (dragged || !scene) return
  const anchor = scene.pick((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
  if (!anchor) return
  void scene.focusObject(anchor.id)
  if (anchor.type === 'phone') {
    focusInfo.value = { title: anchor.label, sub: 'VIEW EXHIBIT · 点击下方查看完整展品' }
  } else {
    focusInfo.value = { title: anchor.label, sub: 'TECHNOLOGY MOMENT · 抽象标记（ABSTRACT）' }
  }
}

async function focusTechnology(techId: string) {
  if (!scene) return
  await scene.focusTechnology(techId)
  focusInfo.value = { title: techId.toUpperCase(), sub: 'TECHNOLOGY MOMENT' }
}

function goScene(year: number) {
  router.push(`/museum/time-machine/${year}`)
}

function shareScene() {
  const url = `${location.origin}/museum/time-machine/${year.value}`
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
  if (nav.share) void nav.share({ title: `Mobile Museum — ${year.value}`, url }).catch(() => {})
  else void navigator.clipboard.writeText(url).catch(() => {})
}

const moments = computed(() => sv.value?.moments ?? [])
</script>

<template>
  <div class="scn">
    <p v-if="status === 'loading'" class="label container" style="padding-block: 160px">正在重构历史场景……</p>

    <section v-else-if="status === 'error'" class="scn__missing container glass-card">
      <p class="mono">SCENE UNAVAILABLE</p>
      <h1 class="heading-2" style="margin-block: 16px">这个场景暂时无法呈现。</h1>
      <MuseumButton to="/museum/time-machine" variant="cta">回到时间机器</MuseumButton>
    </section>

    <template v-else-if="sv">
      <!-- ====== 3D 场景 Hero（§93：唯一焦点；§65：移动端滚动换焦点）====== -->
      <section
        class="scn__stage"
        :data-cursor="has3d ? '拖拽' : undefined"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="() => {}"
      >
        <div class="scn__year-plate container">
          <p class="scn__year year-mid">{{ sv.scene.year }}</p>
          <h1 class="scn__title heading-2">{{ sv.scene.titleZh }}</h1>
          <p class="label mono scn__sub">{{ sv.scene.title }} · {{ ACCURACY_LABEL[sv.scene.sceneType].split(' · ')[0] }}</p>
        </div>
        <p v-if="focusInfo" class="scn__focus glass-card" role="status">
          <span class="scn__focus-title">{{ focusInfo.title }}</span>
          <span class="label">{{ focusInfo.sub }}</span>
        </p>
        <p v-if="!has3d" class="label scn__fallback container">
          3D 场景不可用 —— 以下图文档案照常可用（规范 §87）。
        </p>
      </section>

      <!-- ====== 控制条（§67：只提供 MAP / TIMELINE / EXHIBIT / SOURCES）====== -->
      <nav class="scn__controls container" aria-label="场景控制">
        <MuseumButton to="/museum" variant="line" size="md">MAP · 展厅</MuseumButton>
        <MuseumButton to="/timeline" variant="line">TIMELINE</MuseumButton>
        <router-link v-if="sv.hero" :to="`/museum/exhibit/${sv.hero.id}`" class="scn__ctrl label">
          EXHIBIT · {{ sv.hero.name }} →
        </router-link>
        <button class="scn__ctrl label" @click="sourceOpen = !sourceOpen">SOURCES</button>
      </nav>

      <!-- ====== Intro（§91：40–100 字）====== -->
      <section class="scn__intro-block container">
        <p class="body-lg scn__intro-text">{{ sv.scene.description }}</p>
      </section>

      <!-- ====== 章节（§41–§42：one idea + exhibits + context）====== -->
      <section class="scn__chapters container">
        <article v-for="(c, i) in sv.chapters" :key="i" class="scn__chapter glass-card">
          <p class="mono scn__chapter-no">{{ String(i + 1).padStart(2, '0') }}</p>
          <h2 class="scn__chapter-title">{{ c.title }}</h2>
          <p class="body-md scn__chapter-text">{{ c.text }}</p>
          <div v-if="c.phones.length" class="scn__chapter-phones">
            <router-link
              v-for="p in c.phones"
              :key="p.id"
              :to="`/museum/exhibit/${p.id}`"
              class="scn__chapter-phone"
              data-cursor="VIEW EXHIBIT"
            >
              <PhonePhoto :phone="p" thumb />
              <span class="scn__chapter-name">{{ p.name }}</span>
            </router-link>
          </div>
        </article>
      </section>

      <!-- ====== THEN / NOW（§18–§22：Era vs 现役）====== -->
      <section v-if="sv.thenNow.dimensions.length" class="scn__thennow container">
        <p class="label scn__label">THEN / NOW · 当时与现在</p>
        <div class="scn__tn-grid">
          <div class="scn__tn-col">
            <p class="mono scn__tn-year">THEN · {{ sv.scene.year }}</p>
            <p v-if="sv.thenNow.hero" class="label scn__tn-device">{{ sv.thenNow.hero.name }}</p>
            <dl>
              <div v-for="d in sv.thenNow.dimensions" :key="'t' + d.key" class="scn__tn-row">
                <dt class="label">{{ d.label }}</dt>
                <dd class="mono">{{ d.thenValue ?? '—' }}{{ d.thenValue ? (d.unit ?? '') : '' }}</dd>
              </div>
            </dl>
          </div>
          <div class="scn__tn-col">
            <p class="mono scn__tn-year">NOW · {{ sv.thenNow.reference?.releaseYear ?? '今天' }}</p>
            <p v-if="sv.thenNow.reference" class="label scn__tn-device">{{ sv.thenNow.reference.name }}</p>
            <dl>
              <div v-for="d in sv.thenNow.dimensions" :key="'n' + d.key" class="scn__tn-row">
                <dt class="label">{{ d.label }}</dt>
                <dd class="mono">{{ d.nowValue ?? '—' }}{{ d.nowValue ? (d.unit ?? '') : '' }}</dd>
              </div>
            </dl>
          </div>
        </div>
        <p class="label scn__tn-note">一个时代与今天之间的变化 —— 不是两台设备之间的对比。</p>
      </section>

      <!-- ====== TECHNOLOGY MOMENT（§23–§25）====== -->
      <section v-if="moments.length" class="scn__moments container">
        <p class="label scn__label">TECHNOLOGY MOMENT · 技术发生的瞬间</p>
        <article v-for="m in moments" :key="m.technologyId + m.year" class="scn__moment glass-card">
          <p class="mono scn__moment-year">{{ m.year }}</p>
          <dl class="scn__moment-bca">
            <div><dt class="label">BEFORE</dt><dd class="body-md">{{ m.before }}</dd></div>
            <div><dt class="label">CHANGE</dt><dd class="body-md scn__moment-change">{{ m.change }}</dd></div>
            <div><dt class="label">AFTER</dt><dd class="body-md">{{ m.after }}</dd></div>
          </dl>
          <div v-if="m.phones.length" class="scn__moment-related">
            <router-link v-for="p in m.phones" :key="p.id" :to="`/museum/exhibit/${p.id}`" class="scn__moment-phone" data-cursor="VIEW EXHIBIT">
              <PhonePhoto :phone="p" thumb />
              <span>{{ p.name }}</span>
            </router-link>
          </div>
        </article>
      </section>

      <!-- ====== CULTURE LAYER（§26–§27）====== -->
      <section v-if="sv.culture.length" class="scn__culture container">
        <p class="label scn__label">MOBILE CULTURE · 手机文化</p>
        <div class="scn__culture-grid">
          <article v-for="c in sv.culture" :key="c.id" class="scn__culture-item glass-card">
            <p class="scn__culture-title">{{ c.title }}<span v-if="c.year" class="mono scn__culture-year"> · {{ c.year }}</span></p>
            <p class="body-md scn__culture-desc">{{ c.description }}</p>
            <div v-if="c.phones.length" class="scn__culture-phones">
              <router-link v-for="p in c.phones" :key="p.id" :to="`/museum/exhibit/${p.id}`" class="scn__culture-phone label">
                {{ p.name }} →
              </router-link>
            </div>
          </article>
        </div>
      </section>

      <!-- ====== WHAT CHANGED? + NEXT ERA（§43–§44）====== -->
      <section class="scn__ending container glass-card">
        <p class="label">WHAT CHANGED?</p>
        <p class="scn__changed">{{ sv.scene.whatChanged }}</p>
        <div class="scn__ending-actions">
          <button v-if="sv.next" class="scn__next" @click="goScene(sv.next.year)">
            NEXT ERA → {{ sv.next.year }} {{ sv.next.titleZh }}
          </button>
          <button v-else-if="sv.previous" class="scn__next" @click="goScene(sv.previous.year)">
            ← PREVIOUS ERA · {{ sv.previous.year }}
          </button>
          <button class="scn__share label" @click="shareScene">SHARE SCENE</button>
        </div>
      </section>

      <!-- ====== Scene Timeline（§32–§33）====== -->
      <nav class="scn__timeline container" aria-label="场景时间线">
        <button
          v-for="s in timeMachineService.getAllScenes()"
          :key="s.year"
          class="scn__tl-chip mono"
          :class="{ 'scn__tl-chip--on': s.year === sv.scene.year }"
          @click="goScene(s.year)"
        >
          {{ s.year }}
        </button>
      </nav>

      <!-- ====== 关系与路线联动（§45–§50 + V0.8 §44 Scene → Curator）====== -->
      <nav class="scn__links container" aria-label="继续探索">
        <router-link :to="`/explore/graph?focus=phone:${sv.scene.featuredPhoneIds[0]}`" class="scn__link label">
          EXPLORE RELATIONS →
        </router-link>
        <router-link v-if="sv.scene.storyIds?.length" :to="`/explore/stories/${sv.scene.storyIds[0]}`" class="scn__link label">
          READ STORY →
        </router-link>
        <router-link to="/explore/journeys" class="scn__link label">START HISTORICAL JOURNEY →</router-link>
        <button class="scn__link label" @click="router.back()">EXIT TIME MACHINE</button>
      </nav>

      <section class="scn__curate container">
        <AddToExhibition
          block-type="time-machine"
          :block-data="() => ({ year: sv!.scene.year, sceneId: sv!.scene.id, relatedPhoneIds: sv!.scene.featuredPhoneIds })"
          label="SAVE SCENE TO EXHIBITION · 把这个场景收进你的展览"
        />
      </section>

      <!-- ====== ABOUT THIS SCENE（§38–§40）====== -->
      <section v-if="sourceOpen" class="scn__sources container glass-card">
        <p class="label scn__label">ABOUT THIS SCENE</p>
        <p class="label">{{ ACCURACY_LABEL[sv.scene.sceneType] }}</p>
        <p class="body-md scn__sources-text">RECONSTRUCTION METHOD — Documented objects were combined into a curated digital exhibition.（展品与关系均来自档案数据；灯光与空间氛围为策展表达，不代表历史事实。）</p>
        <p class="label">CURATED BY · {{ sv.scene.curatedBy }}</p>
        <p class="label">SOURCE IDS · {{ (sv.scene.sourceIds ?? []).join(', ') }}</p>
      </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.scn {
  padding-bottom: $sp-10;

  &__missing {
    margin-top: calc(120px + env(safe-area-inset-top));
    padding: $sp-7 $sp-6;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    gap: $sp-2;
    align-items: flex-start;

    .mono {
      font-size: 11px;
      letter-spacing: 0.2em;
      color: $c-text-3;
    }
  }

  &__stage {
    position: relative;
    height: 74vh;
    height: 74dvh;
    touch-action: pan-y;
  }

  &__year-plate {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(88px + env(safe-area-inset-top));
    z-index: 2;
    pointer-events: none;
  }

  &__year {
    font-size: clamp(64px, 14vw, 150px);
    color: $c-accent;
    line-height: 0.95;
    opacity: 0.92;
  }

  &__title {
    margin-top: $sp-2;
    word-break: keep-all;
  }

  &__sub {
    margin-top: $sp-2;
    font-size: 9px;
    color: $c-text-3;
    letter-spacing: 0.22em;
  }

  &__focus {
    position: absolute;
    right: $sp-4;
    bottom: $sp-4;
    z-index: 3;
    padding: $sp-3 $sp-4;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(12, 12, 12, 0.82);
  }

  &__focus-title {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__fallback {
    position: absolute;
    bottom: $sp-3;
    font-size: 9px;
    color: $c-text-3;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: $sp-3;
    flex-wrap: wrap;
    padding-block: $sp-4;
  }

  &__ctrl {
    color: $c-text-2;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    padding: 9px 16px;

    &:hover {
      color: $c-accent;
    }
  }

  &__intro-block {
    padding-block: $sp-2 $sp-4;
  }

  &__intro-text {
    color: $c-text-2;
    max-width: 44ch;
  }

  &__chapters {
    display: flex;
    flex-direction: column;
    gap: $sp-4;
    padding-block: $sp-4;
  }

  &__chapter {
    padding: $sp-6;
  }

  &__chapter-no {
    font-size: 11px;
    color: $c-accent;
    letter-spacing: 0.2em;
  }

  &__chapter-title {
    margin-top: $sp-2;
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 250;
    letter-spacing: 0.04em;
  }

  &__chapter-text {
    margin-top: $sp-2;
    color: $c-text-2;
  }

  &__chapter-phones {
    margin-top: $sp-4;
    display: flex;
    gap: $sp-4;
  }

  &__chapter-phone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $sp-1;
    font-size: 12px;

    &:hover {
      color: $c-accent;
    }
  }

  &__chapter-name {
    word-break: keep-all;
  }

  &__label {
    font-size: 10px;
    color: $c-text-3;
    margin-bottom: $sp-3;
  }

  &__thennow {
    padding-block: $sp-5;
  }

  &__tn-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-4;

    @include desktop {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__tn-col {
    padding: $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 16px;
  }

  &__tn-year {
    font-size: 12px;
    color: $c-accent;
    letter-spacing: 0.2em;
  }

  &__tn-device {
    margin-top: $sp-1;
    font-size: 12px;
    word-break: keep-all;
  }

  &__tn-row {
    display: flex;
    justify-content: space-between;
    gap: $sp-3;
    padding-block: $sp-2;
    border-top: 1px solid rgba(255, 255, 255, 0.06);

    &:first-child {
      border-top: none;
    }

    dd {
      font-size: 13px;
      text-align: right;
      word-break: keep-all;
    }
  }

  &__tn-note {
    margin-top: $sp-3;
    font-size: 9px;
    color: $c-text-3;
  }

  &__moments {
    padding-block: $sp-5;
    display: flex;
    flex-direction: column;
    gap: $sp-4;
  }

  &__moment {
    padding: $sp-5;
  }

  &__moment-year {
    font-size: 12px;
    color: $c-accent;
  }

  &__moment-bca {
    margin-top: $sp-3;
    display: flex;
    flex-direction: column;
    gap: $sp-3;

    @include desktop {
      flex-direction: row;
      gap: $sp-6;

      > div {
        flex: 1;
      }
    }

    dd {
      margin-top: $sp-1;
      color: $c-text-2;
    }
  }

  &__moment-change {
    color: $c-text !important;
  }

  &__moment-related {
    margin-top: $sp-3;
    display: flex;
    gap: $sp-4;
    flex-wrap: wrap;
  }

  &__moment-phone {
    display: flex;
    align-items: center;
    gap: $sp-2;
    font-size: 12px;

    &:hover {
      color: $c-accent;
    }
  }

  &__culture {
    padding-block: $sp-5;
  }

  &__culture-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-3;

    @include desktop {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__culture-item {
    padding: $sp-4 $sp-5;
  }

  &__culture-title {
    font-size: 16px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__culture-year {
    font-size: 10px;
    color: $c-accent;
  }

  &__culture-desc {
    margin-top: $sp-1;
    color: $c-text-2;
  }

  &__culture-phones {
    margin-top: $sp-2;
    display: flex;
    gap: $sp-3;
    flex-wrap: wrap;
  }

  &__culture-phone {
    color: $c-text-3;

    &:hover {
      color: $c-accent;
    }
  }

  &__ending {
    margin-top: $sp-6;
    padding: $sp-7 $sp-6;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-3;
  }

  &__changed {
    font-size: clamp(20px, 3vw, 30px);
    font-weight: 250;
    line-height: 1.4;
    max-width: 26ch;
    word-break: keep-all;
  }

  &__ending-actions {
    margin-top: $sp-2;
    display: flex;
    align-items: center;
    gap: $sp-4;
    flex-wrap: wrap;
  }

  &__next {
    padding: $sp-3 $sp-6;
    border: 1px solid rgba(184, 178, 164, 0.55);
    border-radius: 999px;
    color: $c-accent;
    font-size: 13px;
    word-break: keep-all;

    &:hover {
      background: rgba(184, 178, 164, 0.1);
    }
  }

  &__share {
    color: $c-text-3;

    &:hover {
      color: $c-text;
    }
  }

  &__timeline {
    margin-top: $sp-7;
    display: flex;
    gap: $sp-2;
    flex-wrap: wrap;
  }

  &__tl-chip {
    font-size: 10px;
    padding: 7px 14px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-3;

    &:hover {
      color: $c-text;
    }

    &--on {
      color: $c-accent;
      border-color: rgba(184, 178, 164, 0.55);
    }
  }

  &__links {
    margin-top: $sp-6;
    display: flex;
    gap: $sp-5;
    flex-wrap: wrap;
  }

  &__link {
    color: $c-text-2;
    word-break: keep-all;

    &:hover {
      color: $c-accent;
    }
  }

  &__curate {
    margin-top: $sp-5;
    padding: $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 16px;
  }

  &__sources {
    margin-top: $sp-5;
    padding: $sp-5;
    display: flex;
    flex-direction: column;
    gap: $sp-2;
    align-items: flex-start;
  }

  &__sources-text {
    color: $c-text-3;
  }
}
</style>
