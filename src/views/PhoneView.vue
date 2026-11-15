<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { phoneService } from '@/services/phoneService'
import { eventService } from '@/services/eventService'
import { museumService, type ExhibitRecommendation } from '@/services/museumService'
import { discoveryService } from '@/services/discoveryService'
import { memoryService } from '@/services/memoryService'
import { formFactorLabel as formFactorLabelOf } from '@/data/formFactors'
import { phoneImageList, resolvePhoneImage } from '@/data/assets'
import { useMuseum } from '@/composables/useMuseum'
import { Stage } from '@/three/core/Stage'
import { PhoneScene } from '@/three/scenes/PhoneScene'
import PhoneSilhouette from '@/components/common/PhoneSilhouette.vue'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import PhoneGallery from '@/components/phone/PhoneGallery.vue'
import PhoneQuickFacts from '@/components/phone/PhoneQuickFacts.vue'
import PhoneSpecsTable from '@/components/phone/PhoneSpecsTable.vue'
import PhoneRelatedList from '@/components/phone/PhoneRelatedList.vue'
import PhonePager from '@/components/phone/PhonePager.vue'
import PhoneSources from '@/components/phone/PhoneSources.vue'
import PhoneCollect from '@/components/phone/PhoneCollect.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import type { Phone, HistoricalEvent } from '@/data/types'

gsap.registerPlugin(ScrollTrigger)

// 展品详情（规范 §21–§34 / §63 / §76 / §80）：
// 真实照片 + 快速事实 + 设计/技术/历史 + 3D（如有）+ 来源 + 收藏。
// 玻璃卡承载内容，实拍图与 3D 是展品本体；区块级 UI 拆分在 components/phone/。

const route = useRoute()
const museum = useMuseum()

const phone = ref<Phone | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const contextEvents = ref<HistoricalEvent[]>([])
const related = ref<Phone[]>([])
const prevPhone = ref<Phone>()
const nextPhone = ref<Phone>()
const recommendations = ref<ExhibitRecommendation[]>([])

const has3D = ref(false)
const canExplode = ref(false)
const activeComponent = ref(0)
const explodeEl = ref<HTMLElement>()

let scene: PhoneScene | null = null
let explodeTrigger: ScrollTrigger | null = null

async function load() {
  status.value = 'loading'
  const id = String(route.params.id ?? '')
  const p = await phoneService.getPhoneById(id)
  if (!p) {
    status.value = 'error'
    document.title = `未找到展品 — 手机历史博物馆`
    return
  }
  phone.value = p
  status.value = 'ready'
  document.title = `${p.name}（${p.releaseYear}）— 手机历史博物馆`
  // 发现记录（规范 §40：查看展品即发现，只记一次；§41 全局轻提示）
  discoveryService.discover(p.id, 'view')
  // 最近访问（V0.5 §25）
  memoryService.visit(p.id)

  const [events, rel, adj] = await Promise.all([
    eventService.getEventsForPhone(p.id),
    phoneService.getRelated(p),
    phoneService.getAdjacent(p.id),
  ])
  contextEvents.value = events
  related.value = rel
  prevPhone.value = adj.prev
  nextPhone.value = adj.next
  // YOU MAY ALSO EXPLORE（V0.6 §26–§27：可解释推荐）
  recommendations.value = await museumService.getRecommendations(p.id, 4)

  // 3D 展品仅面向馆藏珍品（数据分级 Level 3，规范 §7 / §31）
  if (p.treasure && p.model && museum.state.webgl) {
    try {
      scene = new PhoneScene(p.model)
      await Stage.setScene(scene)
      has3D.value = true
      canExplode.value = scene.hasExplode
      await nextTick()
      if (canExplode.value) setupExplodeScrub()
    } catch (err) {
      console.error('[PhoneView] 3D 展品不可用', err)
      has3D.value = false // 规范 §34/§69：3D 失败回退实拍图，不白屏
    }
  } else {
    Stage.clearScene()
  }
}

// 拆解视图（规范 §27–§28）：滚动驱动 0→1，完全可逆。
function setupExplodeScrub() {
  if (!explodeEl.value || !scene) return
  explodeTrigger = ScrollTrigger.create({
    trigger: explodeEl.value,
    start: 'top top',
    end: '+=2200',
    pin: true,
    anticipatePin: 1,
    scrub: 0.6,
    onUpdate: (self) => {
      scene?.setExplode(self.progress)
      const idx = Math.min(6, Math.floor(self.progress * 7))
      activeComponent.value = idx
    },
  })
}

onMounted(load)

watch(
  () => route.params.id,
  (id, old) => {
    if (id && id !== old && route.name === 'phone') {
      destroyScene()
      void load()
    }
  },
)

function destroyScene() {
  explodeTrigger?.kill()
  explodeTrigger = null
  scene = null
  has3D.value = false
  canExplode.value = false
}

onUnmounted(destroyScene)

// 360 拖拽（规范 §26 / §32）——仅响应横向意图；竖向手势仍滚动页面。
let lastX = 0
function onPointerDown(e: PointerEvent) {
  lastX = e.clientX
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}
function onPointerMove(e: PointerEvent) {
  if (!scene || !(e.buttons & 1)) return
  const dx = e.clientX - lastX
  lastX = e.clientX
  scene.dragBy(dx)
}
function onPointerUp() {
  scene?.endDrag()
}

const COMPONENT_LABELS = [
  { name: '天线', description: '一根四分之一波长的鞭状天线——1983 年的信号代价。' },
  { name: '听筒', description: '显示屏上方的发声孔。' },
  { name: 'LED 显示屏', description: '一段红色段码屏：只显示数字，别无他物。' },
  { name: '键盘', description: '十二颗机械按键，只能存十个号码。' },
  { name: '主板', description: '分立元件承担着今天一整片晶圆的工作。' },
  { name: '电池', description: '镍镉电池：充电十小时，通话三十分钟。' },
  { name: '后盖', description: '让它成为"砖头"的那块外壳。' },
]

const formFactorLabel = computed(() => {
  const f = phone.value?.formFactor
  return f ? formFactorLabelOf(f) : null
})

// 相关展品 → 列表组件数据（推荐带理由，相关不带）
const relatedItems = computed(() => related.value.map((r) => ({ phone: r })))

const hasHeroImage = computed(() => Boolean(phone.value && resolvePhoneImage(phone.value, 'hero')))
</script>

<template>
  <div class="page phone-page">
    <!-- 未找到 -->
    <section v-if="status === 'error'" class="phone-page__missing container">
      <div class="glass-card missing-card">
        <p class="label">展品未找到</p>
        <h1 class="heading-1" style="margin-block: 24px">这座展厅<br />空空如也。</h1>
        <MuseumButton to="/phones">浏览全部藏品</MuseumButton>
      </div>
    </section>

    <p v-else-if="status === 'loading'" class="label container" style="padding-block: 160px">
      LOADING EXHIBIT · 正在开启展柜……
    </p>

    <template v-else-if="phone">
      <!-- ====== HERO：3D 或实拍为展品本体，玻璃说明牌悬浮 ====== -->
      <section class="phone-hero">
        <div
          v-if="has3D"
          class="phone-hero__drag"
          data-cursor="拖拽"
          aria-hidden="true"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        ></div>

        <!-- 无 3D 时：实拍照片为展品主体（规范 §22/§69） -->
        <div v-else-if="hasHeroImage" class="phone-hero__photo">
          <PhonePhoto :phone="phone" class="phone-hero__photo-img" />
        </div>

        <!-- 实拍与 3D 都没有：线稿图版 + 明确标注（规范 §60） -->
        <div v-else class="phone-hero__unavailable">
          <PhoneSilhouette :form="phone.formFactor" class="phone-hero__fallback" aria-hidden="true" />
          <p class="label">IMAGE UNAVAILABLE · 图版待补</p>
        </div>

        <div class="phone-hero__inner container">
          <div class="glass-card phone-hero__plate">
            <p v-if="phone.exhibitNo" class="phone-hero__exhibit-no mono">{{ phone.exhibitNo }}</p>
            <p class="phone-hero__year year-mid">{{ phone.releaseYear }}</p>
            <h1 class="phone-hero__name">{{ phone.name }}</h1>
            <p class="phone-hero__tagline body-lg">{{ phone.tagline }}</p>
            <div class="phone-hero__meta">
              <p class="phone-hero__badge label">
                {{ has3D ? '3D 展品 — 拖拽旋转' : hasHeroImage ? '实拍图版' : '档案图版 — 实拍与 3D 筹备中' }}
              </p>
              <p class="phone-hero__brand label">{{ phone.brandName }}<span v-if="phone.brandEn" class="mono"> · {{ phone.brandEn.toUpperCase() }}</span></p>
            </div>
          </div>
        </div>

        <p class="phone-hero__scroll label" aria-hidden="true">↓</p>
      </section>

      <!-- ====== QUICK FACTS（规范 §26：展签，非规格表） ====== -->
      <section class="section container">
        <div class="glass-card">
          <PhoneQuickFacts :phone="phone" />
        </div>
      </section>

      <!-- ====== 实拍图版（V0.2.5 §14：仅 approved 真实图） ====== -->
      <section v-if="phone.assets && phoneImageList(phone).length" class="section container">
        <p class="label section__index">实拍图版</p>
        <GlassCard>
          <PhoneGallery :phone="phone" />
        </GlassCard>
      </section>

      <!-- ====== 设计 ====== -->
      <section class="section container">
        <p class="label section__index">01 — 设计</p>
        <div class="glass-card section__card">
          <h2 class="heading-2">{{ formFactorLabel ?? '器物' }}，属于它的十年。</h2>
          <p class="body-md section__story">{{ phone.story }}</p>
        </div>
      </section>

      <!-- ====== 技术 / 规格铭牌 ====== -->
      <section class="section container">
        <p class="label section__index">02 — 技术</p>
        <div class="glass-card">
          <PhoneSpecsTable :phone="phone" />
        </div>
      </section>

      <!-- ====== 为什么重要 ====== -->
      <section class="section container">
        <p class="label section__index">03 — 为什么重要</p>
        <div class="glass-card section__card">
          <p class="section__quote">{{ phone.significance }}</p>
          <p v-if="phone.impact" class="body-md section__impact">{{ phone.impact }}</p>
        </div>
      </section>

      <!-- ====== 拆解视图（Level 3 珍品，规范 §27–§28） ====== -->
      <section v-if="has3D && canExplode" ref="explodeEl" class="explode">
        <div class="explode__overlay container">
          <div class="glass-card explode__panel">
            <p class="label">04 — 拆解视图</p>
            <ul class="explode__list">
              <li
                v-for="(c, i) in COMPONENT_LABELS"
                :key="c.name"
                class="explode__item"
                :class="{ 'explode__item--active': activeComponent === i }"
              >
                <p class="explode__name mono">{{ String(i + 1).padStart(2, '0') }} · {{ c.name }}</p>
                <p class="explode__desc body-md">{{ c.description }}</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- ====== 历史背景（V0.6：时代环境 + 关系图谱联动） ====== -->
      <section v-if="contextEvents.length" class="section container">
        <p class="label section__index">05 — 历史背景</p>
        <div class="glass-card section__card">
          <div class="context">
            <article v-for="e in contextEvents" :key="e.id" class="context__row">
              <p class="context__year mono">{{ e.year }}</p>
              <div>
                <h3 class="context__title">{{ e.title }}</h3>
                <p class="body-md">{{ e.description }}</p>
              </div>
            </article>
          </div>
          <div class="section__links">
            <router-link v-if="phone" class="section__link label" :to="`/explore/context/${phone.releaseYear}`">
              时代环境 · {{ phone.releaseYear }} →
            </router-link>
            <router-link v-if="phone" class="section__link label" :to="`/explore/graph?focus=phone:${phone.id}`">
              关系图谱 · EXPLORE RELATIONS →
            </router-link>
          </div>
        </div>
      </section>

      <!-- ====== 关系与时代（独立入口，无事件也可用） ====== -->
      <nav v-if="!contextEvents.length && phone" class="section container phonelinks" aria-label="关系与时代">
        <div class="glass-card phonelinks__card">
          <router-link class="section__link label" :to="`/explore/context/${phone.releaseYear}`">
            时代环境 · {{ phone.releaseYear }} 的世界 →
          </router-link>
          <router-link class="section__link label" :to="`/explore/graph?focus=phone:${phone.id}`">
            关系图谱 · EXPLORE RELATIONS →
          </router-link>
          <router-link class="section__link label" :to="`/explore/journeys`">
            策展路线 · START A JOURNEY →
          </router-link>
        </div>
      </nav>

      <!-- ====== YOU MAY ALSO EXPLORE（V0.6 §26–§27：带理由的推荐） ====== -->
      <section v-if="recommendations.length" class="section container">
        <p class="label section__index">06 — 下一件展品 · YOU MAY ALSO EXPLORE</p>
        <div class="glass-card">
          <PhoneRelatedList :items="recommendations" />
        </div>
      </section>

      <!-- ====== 相关展品 ====== -->
      <section v-if="related.length" class="section container">
        <p class="label section__index">07 — 相关展品</p>
        <div class="glass-card">
          <PhoneRelatedList :items="relatedItems" />
        </div>
      </section>

      <!-- ====== 收藏与策展入口（规范 §76–§77） ====== -->
      <section class="section container">
        <PhoneCollect :phone="phone" />
      </section>

      <!-- ====== 上一台 / 下一台（规范 §80） ====== -->
      <section class="section container">
        <PhonePager :prev="prevPhone" :next="nextPhone" />
      </section>

      <!-- ====== SOURCES（规范 §63–§64 / §107） ====== -->
      <section class="section container">
        <PhoneSources :phone="phone" class="glass-card" />
      </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.phone-page {
  padding-top: calc(72px + env(safe-area-inset-top));

  &__missing {
    padding-block: 120px;
  }
}

.missing-card {
  padding: $sp-8 $sp-6;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $sp-2;
}

// ---- HERO ----
.phone-hero {
  position: relative;
  height: 88vh;
  height: 88dvh;
  display: flex;
  align-items: flex-end;

  &__drag {
    position: absolute;
    inset: 0;
    touch-action: pan-y;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__photo {
    position: absolute;
    inset: 0 0 22% 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    :deep(.phone-photo__img) {
      max-height: 100%;
      max-width: min(72vw, 520px);
    }
  }

  &__unavailable {
    position: absolute;
    left: 50%;
    top: 40%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $sp-3;

    .label {
      font-size: 9px;
      color: $c-text-3;
    }
  }

  &__fallback {
    width: 130px;
    opacity: 0.5;
  }

  &__inner {
    position: relative;
    z-index: 1;
    pointer-events: none;
    padding-bottom: $sp-6;

    :deep(.museum-button),
    button {
      pointer-events: auto;
    }
  }

  &__plate {
    pointer-events: auto;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    padding: $sp-6;
    max-width: 560px;
  }

  &__exhibit-no {
    font-size: 10px;
    letter-spacing: 0.3em;
    color: $c-accent;
    margin-bottom: $sp-2;
  }

  &__year {
    color: $c-accent;
    font-size: clamp(40px, 7vw, 76px);
  }

  &__name {
    font-size: clamp(30px, 5.4vw, 64px);
    font-weight: 250;
    line-height: 1.05;
    letter-spacing: -0.01em;
    margin-top: $sp-1;
  }

  &__tagline {
    margin-top: $sp-3;
    font-size: 15px;
    color: $c-text-2;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: $sp-1;
    margin-top: $sp-4;
  }

  &__badge {
    font-size: 10px;
    color: $c-accent;
  }

  &__brand {
    font-size: 10px;
  }

  &__scroll {
    position: absolute;
    right: $page-pad-x;
    bottom: $sp-5;
    color: $c-text-3;
  }
}

// ---- 章节 ----
.section {
  position: relative;
  padding-block: $sp-4;

  &:first-of-type {
    padding-top: $sp-6;
  }

  &__index {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: $sp-3;
    font-size: 10px;
  }

  &__card {
    padding: $sp-7 $sp-6;

    @include desktop {
      padding: $sp-8;
    }
  }

  &__story {
    margin-top: $sp-5;
    max-width: 68ch;
  }

  &__quote {
    font-size: clamp(22px, 3.2vw, 40px);
    font-weight: 250;
    line-height: 1.3;
    letter-spacing: 0.01em;
    max-width: 26ch;
  }

  &__impact {
    margin-top: $sp-5;
    max-width: 62ch;
  }

  &__links {
    margin-top: $sp-5;
    padding-top: $sp-4;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    gap: $sp-5;
    flex-wrap: wrap;
  }

  &__link {
    color: $c-accent;
    word-break: keep-all;

    &:hover {
      color: $c-text;
    }
  }
}

// ---- 关系与时代入口 ----
.phonelinks {
  &__card {
    padding: $sp-5 $sp-6;
    display: flex;
    gap: $sp-5;
    flex-wrap: wrap;
  }
}

// ---- 拆解 ----
.explode {
  position: relative;
  height: 100vh;
  height: 100dvh;
  display: flex;
  align-items: center;

  &__overlay {
    position: relative;
    z-index: 1;
    pointer-events: none;
  }

  &__panel {
    pointer-events: none;
    padding: $sp-5;
    max-width: 360px;
    background: rgba(10, 10, 10, 0.35);
  }

  &__list {
    margin-top: $sp-4;
    display: flex;
    flex-direction: column;
    gap: $sp-2;
  }

  &__item {
    opacity: 0.35;
    transition: opacity 0.35s var(--ease-museum);

    &--active {
      opacity: 1;
    }
  }

  &__name {
    font-size: 12px;
    letter-spacing: 0.18em;
  }

  &__desc {
    font-size: 13px;
    margin-top: 2px;
  }
}

// ---- 历史背景 ----
.context {
  display: flex;
  flex-direction: column;
  gap: $sp-5;

  &__row {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: $sp-5;
    align-items: baseline;
  }

  &__year {
    color: $c-accent;
    font-size: 14px;
  }

  &__title {
    font-size: 17px;
    font-weight: 400;
    margin-bottom: $sp-1;
  }
}
</style>
