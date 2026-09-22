<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useMuseum } from '@/composables/useMuseum'
import { useCollection } from '@/composables/useCollection'
import { discoveryService } from '@/services/discoveryService'
import { RELATION_LABELS, type NearbyExhibit } from '@/services/museumService'
import { resolvePhoneImage } from '@/data/assets'
import { formFactorLabel } from '@/data/formFactors'
import { hasExhibitContent } from '@/data/exhibits'
import type { Phone } from '@/data/types'
import { ExhibitViewer } from '@/three/core/ExhibitViewer'
import PhonePhoto from '@/components/common/PhonePhoto.vue'

// ExhibitOverlay（规范 §22–§26 / §27）：展厅内点击展品后的聚焦层。
// REAL DEVICE ↔ 3D VIEW 明确切换（不自动切换，规范 §24）；
// NEARBY EXHIBITS 点击 → 相机平滑飞向目标展品（规范 §27）。
// 场景保持挂载 —— 返回展厅不重载（规范 §26）。

const props = defineProps<{
  phone: Phone
  nearby: NearbyExhibit[]
}>()

const emit = defineEmits<{
  close: []
  navigate: [phone: Phone]
}>()

const museum = useMuseum()
const { hasPhone, togglePhone } = useCollection()

const hasPhoto = computed(() => Boolean(resolvePhoneImage(props.phone, 'hero')))
const has3d = computed(() => Boolean(props.phone.model) && museum.state.webgl)
const mode = ref<'photo' | '3d'>(hasPhoto.value ? 'photo' : '3d')

const canvasEl = ref<HTMLCanvasElement>()
let viewer: ExhibitViewer | null = null

watch(
  mode,
  async (m) => {
    if (m !== '3d' || !has3d.value) return
    await nextTick()
    if (!canvasEl.value || viewer) return
    try {
      viewer = new ExhibitViewer(canvasEl.value)
      await viewer.load(props.phone.model!)
    } catch (err) {
      console.error('[ExhibitOverlay] 3D 加载失败，回退实拍图（规范 §74）', err)
      viewer?.dispose()
      viewer = null
      if (hasPhoto.value) mode.value = 'photo'
    }
  },
  { immediate: true },
)

onMounted(() => {
  // 发现记录（规范 §40）：进入珍藏或打开展签即发现，只记一次。
  discoveryService.discover(props.phone.id, props.phone.exhibitLevel === 3 ? 'treasure' : 'hall')
})

onBeforeUnmount(() => {
  viewer?.dispose()
  viewer = null
})

const quickFacts = computed(() => {
  const p = props.phone
  const rows: Array<[string, string]> = []
  rows.push(['年份', String(p.releaseYear)])
  if (p.specs?.weight) rows.push(['重量', `${p.specs.weight} g`])
  if (p.formFactor) rows.push(['形态', formFactorLabel(p.formFactor)])
  if (p.specs?.displaySize) rows.push(['屏幕', `${p.specs.displaySize}"`])
  if (p.specs?.network?.length) rows.push(['网络', p.specs.network.join(' · ')])
  return rows.slice(0, 4)
})

const inCollection = computed(() => hasPhone(props.phone.id))

function reset3d() {
  viewer?.reset()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- 覆盖层传送到 body：脱离 .page-root 的层叠上下文，才能盖过固定导航 -->
  <Teleport to="body">
    <div class="exhibit" role="dialog" aria-modal="true" :aria-label="`${phone.name} 展品详情`">
    <div class="exhibit__backdrop" aria-hidden="true" @click="emit('close')"></div>

    <div class="exhibit__panel glass-card">
      <header class="exhibit__head">
        <p class="exhibit__no mono">{{ phone.exhibitNo ?? 'MM' }}</p>
        <button class="exhibit__close" aria-label="返回展厅" @click="emit('close')">✕</button>
      </header>

      <!-- 媒体：REAL DEVICE ↔ 3D VIEW（规范 §24） -->
      <div class="exhibit__media" :data-cursor="mode === '3d' ? '拖拽' : undefined">
        <PhonePhoto v-if="mode === 'photo'" :phone="phone" class="exhibit__photo" />
        <canvas v-else ref="canvasEl" class="exhibit__canvas" aria-label="3D 展品，可拖拽旋转"></canvas>

        <div v-if="has3d && hasPhoto" class="exhibit__toggle" role="tablist" aria-label="切换展示方式">
          <button
            class="exhibit__mode"
            :class="{ 'exhibit__mode--on': mode === 'photo' }"
            role="tab"
            :aria-selected="mode === 'photo'"
            @click="mode = 'photo'"
          >
            REAL DEVICE
          </button>
          <button
            class="exhibit__mode"
            :class="{ 'exhibit__mode--on': mode === '3d' }"
            role="tab"
            :aria-selected="mode === '3d'"
            @click="mode = '3d'"
          >
            3D VIEW
          </button>
        </div>
        <button v-if="mode === '3d' && viewer" class="exhibit__reset label" @click="reset3d">RESET</button>
      </div>

      <!-- 展签正文 -->
      <div class="exhibit__body">
        <p class="exhibit__year mono">{{ phone.releaseYear }}</p>
        <h2 class="exhibit__name">{{ phone.name }}</h2>
        <p v-if="phone.tagline" class="exhibit__tagline body-md">{{ phone.tagline }}</p>

        <dl class="exhibit__facts">
          <div v-for="[k, v] in quickFacts" :key="k" class="exhibit__fact">
            <dt class="label">{{ k }}</dt>
            <dd class="mono">{{ v }}</dd>
          </div>
        </dl>

        <p v-if="phone.story" class="exhibit__story body-md">{{ phone.story }}</p>
        <p v-if="phone.significance" class="exhibit__quote">{{ phone.significance }}</p>

        <!-- NEARBY EXHIBITS（规范 §27） -->
        <section v-if="nearby.length" class="exhibit__nearby" aria-label="附近展品">
          <p class="label exhibit__nearby-title">NEARBY EXHIBITS · 附近展品</p>
          <button v-for="n in nearby" :key="n.phone.id" class="exhibit__near-row" @click="emit('navigate', n.phone)">
            <span class="exhibit__near-year mono">{{ n.phone.releaseYear }}</span>
            <PhonePhoto :phone="n.phone" thumb class="exhibit__near-photo" />
            <span class="exhibit__near-body">
              <span class="exhibit__near-name">{{ n.phone.name }}</span>
              <span class="label exhibit__near-rel">{{ RELATION_LABELS[n.relation].zh }}</span>
            </span>
            <span class="exhibit__near-arrow mono" aria-hidden="true">→</span>
          </button>
        </section>

        <!-- 动作 -->
        <div class="exhibit__actions">
          <button class="exhibit__collect" :class="{ 'exhibit__collect--on': inCollection }" @click="togglePhone(phone.id)">
            <span>{{ inCollection ? '✓' : '♡' }}</span>
            <span>{{ inCollection ? '已收藏' : '收藏' }}</span>
          </button>
          <router-link class="exhibit__profile label" :to="`/phone/${phone.id}`">查看完整档案 →</router-link>
          <!-- V0.5 §41：支持深度观展的展品直达 Exhibit -->
          <router-link
            v-if="hasExhibitContent(phone.id)"
            class="exhibit__profile exhibit__profile--accent label"
            :to="`/museum/exhibit/${phone.id}`"
          >
            LIVING EXHIBIT →
          </router-link>
          <!-- V0.6 §39：Museum → EXPLORE / NEXT DISCOVERY -->
          <router-link class="exhibit__profile label" :to="`/explore/graph?focus=phone:${phone.id}`">
            EXPLORE RELATIONS →
          </router-link>
        </div>
      </div>
    </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.exhibit {
  position: fixed;
  inset: 0;
  z-index: 60;

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(4, 4, 4, 0.68);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
  }

  &__panel {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
    border-radius: 22px 22px 0 0;
    background: rgba(12, 12, 12, 0.82);
    overflow: hidden;

    @include desktop {
      left: auto;
      top: 0;
      width: min(520px, 44vw);
      max-height: none;
      border-radius: 0;
      border-right: none;
      border-top: none;
      border-bottom: none;
    }
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $sp-4 $sp-5 0;
  }

  &__no {
    font-size: 11px;
    letter-spacing: 0.3em;
    color: $c-accent;
  }

  &__close {
    width: 36px;
    height: 36px;
    border: 1px solid $c-line-soft;
    border-radius: 50%;
    color: $c-text-2;
    font-size: 14px;
    transition: border-color 0.3s var(--ease-museum), color 0.3s var(--ease-museum);

    &:hover {
      color: $c-text;
      border-color: $c-line;
    }
  }

  &__media {
    position: relative;
    margin: $sp-4 $sp-5;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    background: radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, 0.045), transparent 70%);

    @include desktop {
      height: 320px;
    }
  }

  &__photo {
    max-height: 92%;
    max-width: 82%;
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(.phone-photo__img) {
      max-height: 280px;
      max-width: 100%;
      object-fit: contain;
    }
  }

  &__canvas {
    width: 100%;
    height: 100%;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__toggle {
    position: absolute;
    left: 50%;
    bottom: $sp-3;
    transform: translateX(-50%);
    display: flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    background: rgba(8, 8, 8, 0.72);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }

  &__mode {
    @include label-style(10px);
    padding: 6px 14px;
    border-radius: 999px;
    color: $c-text-3;
    transition: color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

    &--on {
      color: #0a0a0a;
      background: rgba(255, 255, 255, 0.9);
    }
  }

  &__reset {
    position: absolute;
    right: $sp-3;
    top: $sp-3;
    font-size: 9px;
    padding: 5px 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    color: $c-text-3;

    &:hover {
      color: $c-text;
    }
  }

  &__body {
    padding: 0 $sp-5 $sp-6;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  &__year {
    color: $c-accent;
    font-size: 13px;
    letter-spacing: 0.25em;
  }

  &__name {
    margin-top: $sp-1;
    font-size: clamp(24px, 4vw, 34px);
    font-weight: 250;
    line-height: 1.15;
    word-break: keep-all;
  }

  &__tagline {
    margin-top: $sp-2;
    color: $c-text-2;
  }

  &__facts {
    margin-top: $sp-4;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $sp-3 $sp-4;

    @include desktop {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  &__fact {
    dd {
      margin-top: 2px;
      font-size: 13px;
      color: $c-text;
      word-break: keep-all;
    }
  }

  &__story {
    margin-top: $sp-4;
    color: $c-text-2;
    line-height: 1.8;
  }

  &__quote {
    margin-top: $sp-4;
    font-size: clamp(16px, 2.4vw, 21px);
    font-weight: 250;
    line-height: 1.5;
    border-left: 2px solid $c-accent;
    padding-left: $sp-4;
    color: $c-text;
    word-break: keep-all;
  }

  &__nearby {
    margin-top: $sp-6;
  }

  &__nearby-title {
    font-size: 10px;
    color: $c-text-3;
    margin-bottom: $sp-2;
  }

  &__near-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-2 0;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    text-align: left;
    transition: background 0.3s var(--ease-museum);

    &:hover {
      background: rgba(255, 255, 255, 0.03);

      .exhibit__near-arrow {
        transform: translateX(4px);
        color: $c-text;
      }
    }
  }

  &__near-year {
    width: 40px;
    color: $c-text-3;
    font-size: 12px;
    flex-shrink: 0;
  }

  &__near-photo {
    width: 34px;
    height: 44px;
    flex-shrink: 0;
  }

  &__near-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__near-name {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__near-rel {
    font-size: 9px;
    color: $c-accent;
  }

  &__near-arrow {
    margin-left: auto;
    color: $c-text-3;
    transition: transform 0.3s var(--ease-museum), color 0.3s var(--ease-museum);
  }

  &__actions {
    margin-top: $sp-6;
    display: flex;
    align-items: center;
    gap: $sp-5;
    flex-wrap: wrap;
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

  &__profile {
    color: $c-text-2;
    border-bottom: 1px solid $c-line;
    padding-bottom: 2px;

    &:hover {
      color: $c-text;
    }

    &--accent {
      color: $c-accent;
      border-bottom-color: rgba(184, 178, 164, 0.5);
    }
  }
}
</style>
