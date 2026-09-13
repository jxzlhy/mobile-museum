<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { phoneService } from '@/services/phoneService'
import { eventService } from '@/services/eventService'
import { formFactorLabel as formFactorLabelOf } from '@/data/formFactors'
import { phoneImageList, resolvePhoneImage } from '@/data/assets'
import { useMuseum } from '@/composables/useMuseum'
import { useCollection } from '@/composables/useCollection'
import { Stage } from '@/three/core/Stage'
import { PhoneScene } from '@/three/scenes/PhoneScene'
import PhoneSilhouette from '@/components/common/PhoneSilhouette.vue'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import PhoneGallery from '@/components/phone/PhoneGallery.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import type { Phone, HistoricalEvent } from '@/data/types'

gsap.registerPlugin(ScrollTrigger)

// 展品详情（规范 §21–§34 / §63 / §76 / §80）：
// 真实照片 + 快速事实 + 设计/技术/历史 + 3D（如有）+ 来源 + 收藏。
// 玻璃卡承载内容，实拍图与 3D 是展品本体。

const route = useRoute()
const museum = useMuseum()
const { hasPhone, togglePhone } = useCollection()

const phone = ref<Phone | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const contextEvents = ref<HistoricalEvent[]>([])
const related = ref<Phone[]>([])
const prevPhone = ref<Phone>()
const nextPhone = ref<Phone>()

const has3D = ref(false)
const canExplode = ref(false)
const activeComponent = ref(0)
const explodeEl = ref<HTMLElement>()

// 收藏按钮的轻量反馈（规范 §77）：小范围缩放，不弹 Toast
const collectedPulse = ref(false)

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

  const [events, rel, adj] = await Promise.all([
    eventService.getEventsForPhone(p.id),
    phoneService.getRelated(p),
    phoneService.getAdjacent(p.id),
  ])
  contextEvents.value = events
  related.value = rel
  prevPhone.value = adj.prev
  nextPhone.value = adj.next

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

// Quick Facts（规范 §26）：少量高价值信息，展签而非规格表。
const quickFacts = computed(() => {
  const p = phone.value
  if (!p) return []
  const facts: Array<{ label: string; value: string }> = []
  facts.push({ label: '年份', value: String(p.releaseYear) })
  if (p.specs?.weight) facts.push({ label: '重量', value: `${p.specs.weight} g` })
  if (p.specs?.displaySize) facts.push({ label: '屏幕', value: `${p.specs.displaySize}"` })
  if (p.specs?.camera) facts.push({ label: '相机', value: p.specs.camera.split('（')[0].split(' + ')[0] })
  if (p.exhibitNo) facts.push({ label: '编号', value: p.exhibitNo })
  return facts.slice(0, 5)
})

const specRows = computed(() => {
  const p = phone.value
  if (!p) return []
  const rows: Array<[string, string]> = []
  if (p.specs?.display) rows.push(['屏幕', `${p.specs.displaySize ? p.specs.displaySize + '" · ' : ''}${p.specs.display}`])
  if (p.specs?.camera) rows.push(['相机', p.specs.camera])
  if (p.specs?.cameraFront) rows.push(['前置', p.specs.cameraFront])
  if (p.specs?.network?.length) rows.push(['网络', p.specs.network.join(' · ')])
  if (p.specs?.operatingSystem) rows.push(['系统', p.specs.operatingSystem])
  if (p.specs?.battery) rows.push(['电池', p.specs.battery])
  if (p.specs?.weight) rows.push(['重量', `${p.specs.weight} 克`])
  if (p.specs?.dimensions) rows.push(['尺寸', p.specs.dimensions])
  if (p.technologies?.length) rows.push(['技术特性', p.technologies.join(' · ')])
  return rows
})

const formFactorLabel = computed(() => {
  const f = phone.value?.formFactor
  return f ? formFactorLabelOf(f) : null
})

const inCollection = computed(() => phone.value ? hasPhone(phone.value.id) : false)

function onCollect() {
  if (!phone.value) return
  togglePhone(phone.value.id)
  collectedPulse.value = true
  setTimeout(() => (collectedPulse.value = false), 450)
}

/** 图片授权署名清单（规范 §64）。 */
const imageCredits = computed(() => {
  const p = phone.value
  if (!p) return []
  return phoneImageList(p)
    .filter((img) => img.source)
    .map((img) => ({
      id: img.path,
      alt: img.alt ?? p.name,
      author: img.source?.author ?? '未知作者',
      license: img.source?.license ?? '',
      licenseUrl: img.source?.licenseUrl,
      sourceUrl: img.source?.url,
    }))
})

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
        <div class="glass-card quickfacts">
          <div v-for="f in quickFacts" :key="f.label" class="quickfacts__item">
            <p class="quickfacts__value mono">{{ f.value }}</p>
            <p class="quickfacts__label label">{{ f.label }}</p>
          </div>
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
        <div class="glass-card specs">
          <dl class="specs__list">
            <div v-for="[k, v] in specRows" :key="k" class="specs__row">
              <dt class="label">{{ k }}</dt>
              <dd class="mono specs__value">{{ v }}</dd>
            </div>
          </dl>
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

      <!-- ====== 历史背景 ====== -->
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
        </div>
      </section>

      <!-- ====== 相关展品 ====== -->
      <section v-if="related.length" class="section container">
        <p class="label section__index">06 — 相关展品</p>
        <div class="glass-card">
          <nav class="related">
            <router-link
              v-for="r in related"
              :key="r.id"
              :to="`/phone/${r.id}`"
              class="related__row"
              data-cursor="看展"
            >
              <span class="related__year mono">{{ r.releaseYear }}</span>
              <PhonePhoto :phone="r" thumb class="related__photo" />
              <span class="related__body">
                <span class="related__name">{{ r.name }}</span>
                <span class="related__brand label">{{ r.brandName }}</span>
              </span>
              <span class="related__arrow mono" aria-hidden="true">→</span>
            </router-link>
          </nav>
        </div>
      </section>

      <!-- ====== 收藏（规范 §76–§77：轻量反馈） ====== -->
      <section class="section container">
        <div class="glass-card collect">
          <button
            class="collect__btn"
            :class="{ 'collect__btn--on': inCollection, 'collect__btn--pulse': collectedPulse }"
            @click="onCollect"
          >
            <span class="collect__icon">{{ inCollection ? '✓' : '♡' }}</span>
            <span>{{ inCollection ? '已收藏' : '收藏' }}</span>
          </button>
          <MuseumButton to="/collection" variant="line">查看我的手机史</MuseumButton>
        </div>
      </section>

      <!-- ====== 上一台 / 下一台（规范 §80） ====== -->
      <nav class="section container pager" aria-label="相邻展品">
        <router-link
          v-if="prevPhone"
          :to="`/phone/${prevPhone.id}`"
          class="pager__item pager__item--prev"
          data-cursor="看展"
        >
          <span class="label">← 上一台</span>
          <span class="pager__name">{{ prevPhone.name }}</span>
        </router-link>
        <span v-else class="pager__item pager__item--ghost"></span>
        <router-link
          v-if="nextPhone"
          :to="`/phone/${nextPhone.id}`"
          class="pager__item pager__item--next"
          data-cursor="看展"
        >
          <span class="label">下一台 →</span>
          <span class="pager__name">{{ nextPhone.name }}</span>
        </router-link>
      </nav>

      <!-- ====== SOURCES（规范 §63–§64 / §107） ====== -->
      <section class="section container">
        <footer class="sources glass-card">
          <p class="label sources__head">资料来源</p>
          <ul class="sources__list">
            <li v-for="s in phone.sources" :key="s.title ?? s.provider" class="sources__row">
              <span class="sources__kind label">{{ s.title ?? s.provider }}</span>
              <span class="sources__detail body-md">
                {{ s.note }}
                <a v-if="s.url" :href="s.url" target="_blank" rel="noopener" class="sources__link">链接</a>
              </span>
            </li>
            <li v-for="c in imageCredits" :key="'img-' + c.id" class="sources__row">
              <span class="sources__kind label">图片 · {{ c.alt }}</span>
              <span class="sources__detail body-md">
                Photo: {{ c.author }}
                <template v-if="c.license"> · License:
                  <a v-if="c.licenseUrl" :href="c.licenseUrl" target="_blank" rel="noopener" class="sources__link">{{ c.license }}</a>
                  <template v-else>{{ c.license }}</template>
                </template>
                <a v-if="c.sourceUrl" :href="c.sourceUrl" target="_blank" rel="noopener" class="sources__link">来源页</a>
              </span>
            </li>
          </ul>
        </footer>
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
}

// ---- Quick Facts ----
.quickfacts {
  display: flex;
  flex-wrap: wrap;
  gap: $sp-6;
  padding: $sp-5 $sp-6;

  &__item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 72px;
  }

  &__value {
    font-size: clamp(16px, 2vw, 22px);
    font-weight: 500;
    color: $c-text;
    word-break: keep-all;
  }

  &__label {
    font-size: 9px;
  }
}

// ---- 规格 ----
.specs {
  padding: $sp-5;

  &__list {
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: $sp-4;
    padding-block: $sp-3;
    border-top: 1px solid rgba(255, 255, 255, 0.08);

    &:first-child {
      border-top: none;
    }
  }

  &__value {
    color: $c-text-2;
    font-size: 13px;
    word-break: keep-all;
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

// ---- 相关展品 ----
.related {
  display: flex;
  flex-direction: column;

  &__row {
    display: flex;
    align-items: center;
    gap: $sp-4;
    padding-block: $sp-3;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    transition: background 0.35s var(--ease-museum);

    &:first-child {
      border-top: none;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.04);

      .related__arrow {
        transform: translateX(6px);
        color: $c-text;
      }
    }
  }

  &__year {
    color: $c-text-3;
    width: 52px;
    flex-shrink: 0;
  }

  &__photo {
    width: 44px;
    height: 56px;
    flex-shrink: 0;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 17px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__brand {
    font-size: 9px;
  }

  &__arrow {
    margin-left: auto;
    color: $c-text-3;
    transition: transform 0.35s var(--ease-museum), color 0.35s var(--ease-museum);
  }
}

// ---- 收藏 ----
.collect {
  display: flex;
  flex-direction: column;
  gap: $sp-5;
  align-items: flex-start;
  padding: $sp-6;

  @include desktop {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.collect__btn {
  display: inline-flex;
  align-items: center;
  gap: $sp-3;
  padding: $sp-3 $sp-6;
  border: 1px solid $c-line;
  border-radius: 999px;
  color: $c-text;
  @include label-style(12px);
  letter-spacing: 0.2em;
  transition: border-color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

  &:hover {
    border-color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.04);
  }

  &--on {
    border-color: rgba(184, 178, 164, 0.55);
    color: $c-accent;
  }

  &--pulse {
    animation: collect-pulse 0.45s var(--ease-museum);
  }
}

.collect__icon {
  font-size: 14px;
}

@keyframes collect-pulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.06); }
  100% { transform: scale(1); }
}

// ---- 上一台 / 下一台 ----
.pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-3;

  &__item {
    display: flex;
    flex-direction: column;
    gap: $sp-1;
    padding: $sp-4 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
    transition: border-color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

    .label {
      font-size: 9px;
      color: $c-text-3;
    }

    &:hover {
      border-color: $c-line;
      background: rgba(255, 255, 255, 0.03);
    }

    &--next {
      text-align: right;
      align-items: flex-end;
    }

    &--ghost {
      border: none;
    }
  }

  &__name {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }
}

// ---- Sources ----
.sources {
  padding: $sp-5 $sp-6;

  &__head {
    margin-bottom: $sp-3;
    font-size: 10px;
  }

  &__list {
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: $sp-4;
    padding-block: $sp-2;
    border-top: 1px solid rgba(255, 255, 255, 0.06);

    &:first-child {
      border-top: none;
    }
  }

  &__kind {
    font-size: 9px;
    word-break: keep-all;
  }

  &__detail {
    font-size: 12px;
    color: $c-text-3;
    line-height: 1.7;
    word-break: keep-all;
  }

  &__link {
    margin-left: $sp-2;
    color: $c-text-2;
    border-bottom: 1px solid $c-line;

    &:hover {
      color: $c-text;
    }
  }
}
</style>
