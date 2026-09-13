<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { evolutionService } from '@/services/evolutionService'
import { EvolutionTimeline } from '@/animations/evolution/EvolutionTimeline'
import { useMuseum } from '@/composables/useMuseum'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import type { EvolutionPoint } from '@/data/evolution'
import { formFactorLabel } from '@/data/formFactors'

// EVOLUTION（V0.3 §4–§13）：手机如何随时间变化。
// 拖动年份 → 设备/参数/形态同步切换；真实图优先，线稿兜底。

const route = useRoute()
const router = useRouter()
const museum = useMuseum()
const reduced = computed(() => museum.state.motionMode === 'reduced')

const rangeEl = ref<HTMLInputElement>()
const year = ref(1973)
const points = ref<EvolutionPoint[]>([])
const active = computed(() => {
  let p = points.value[0]
  for (const pt of points.value) if (pt.year <= year.value) p = pt
  return p
})
const nextPoint = computed(() => points.value.find((p) => p.year > year.value))

const DECADES = [1970, 1980, 1990, 2000, 2010, 2020]

let timeline: EvolutionTimeline | null = null

onMounted(async () => {
  points.value = await evolutionService.getMilestones()
  const qy = Number(route.query.year)
  year.value = Number.isFinite(qy) && qy >= 1973 && qy <= 2026 ? qy : 1973
  if (rangeEl.value) {
    timeline = new EvolutionTimeline({
      input: rangeEl.value,
      min: evolutionService.range.min,
      max: evolutionService.range.max,
      initial: year.value,
      reduced: reduced.value,
      onYear: (y) => {
        year.value = y
      },
    })
  }
})

onUnmounted(() => {
  timeline?.destroy()
})

// URL 状态（§82）：/explore/evolution?year=2007
watch(year, (y) => {
  router.replace({ query: { ...route.query, year: String(y) } }).catch(() => {})
})

const metrics = computed(() => {
  const p = active.value
  if (!p) return []
  const m = p.metrics
  const out: Array<{ key: string; label: string; value: string; ratio: number }> = []
  if (m.weight !== undefined) {
    out.push({ key: 'weight', label: '重量', value: `${m.weight} g`, ratio: Math.min(1, m.weight / 1200) })
  }
  if (m.thickness !== undefined) {
    out.push({ key: 'thickness', label: '厚度', value: `${m.thickness} 毫米`, ratio: Math.min(1, m.thickness / 45) })
  }
  if (m.displaySize !== undefined) {
    out.push({ key: 'display', label: '屏幕', value: `${m.displaySize}"`, ratio: Math.min(1, m.displaySize / 7) })
  }
  if (m.cameraMP !== undefined) {
    out.push({ key: 'camera', label: '相机', value: `${m.cameraMP} MP`, ratio: Math.min(1, Math.log10(m.cameraMP + 1) / Math.log10(250)) })
  }
  return out.slice(0, 3)
})
</script>

<template>
  <div class="page evo container">
    <header class="evo__head">
      <p class="label">EVOLUTION · 演化长卷</p>
      <h1 class="heading-1" style="margin-top: 16px">手机演化史</h1>
      <p class="evo__intro body-lg">拖动年份，看电话如何在五十年里长成今天的样子。</p>
    </header>

    <!-- 年份展签 -->
    <section class="evo__stage">
      <template v-if="active">
        <p class="evo__year year-display">{{ active.year }}</p>

        <transition name="evo-swap" mode="out-in">
          <div :key="active.phoneId" class="evo__exhibit">
            <router-link :to="`/phone/${active.phoneId}`" class="evo__photo" data-cursor="看展">
              <PhonePhoto :phone="active.phone" mark-missing />
            </router-link>
            <div class="evo__info">
              <h2 class="evo__name">{{ active.phone.name }}</h2>
              <p class="label evo__form">{{ formFactorLabel(active.formFactor) }}</p>
            </div>
          </div>
        </transition>
      </template>
      <p v-else class="label" style="padding-block: 80px">EVOLUTION DATA LOADING…</p>
    </section>

    <!-- 指标（围绕"变化"的简单比例，规范 §12） -->
    <section class="evo__metrics">
      <transition name="evo-swap" mode="out-in">
        <div :key="active?.phoneId" class="evo__metric-list">
          <div v-for="m in metrics" :key="m.key" class="evo__metric">
            <div class="evo__metric-head">
              <span class="label">{{ m.label }}</span>
              <span class="mono evo__metric-value">{{ m.value }}</span>
            </div>
            <div class="evo__metric-bar">
              <div class="evo__metric-fill" :style="{ transform: `scaleX(${m.ratio})` }"></div>
            </div>
          </div>
          <p v-if="metrics.length === 0" class="label">该节点暂无可比数据</p>
        </div>
      </transition>
    </section>

    <!-- 时间轴控制器 -->
    <section class="evo__control">
      <div class="evo__scale mono" aria-hidden="true">
        <span>1973</span><span>1980s</span><span>1990s</span><span>2000s</span><span>2010s</span><span>2026</span>
      </div>
      <input
        ref="rangeEl"
        class="evo__range"
        type="range"
        min="1973"
        max="2026"
        step="1"
        :aria-valuetext="`${active?.year} · ${active?.phone.name}`"
        aria-label="演化年份"
      />
      <div class="evo__ticks mono" aria-hidden="true">
        <span v-for="p in points" :key="p.phoneId" class="evo__tick" :class="{ 'evo__tick--passed': p.year <= year }"></span>
      </div>

      <div class="evo__decades">
        <button
          v-for="d in DECADES"
          :key="d"
          class="evo__decade mono"
          @click="timeline?.setYear(d + 3, { animate: !reduced })"
        >
          {{ d }}s
        </button>
        <button v-if="nextPoint" class="evo__decade evo__decade--next mono" @click="timeline?.setYear(nextPoint.year, { animate: !reduced })">
          → {{ nextPoint.year }}
        </button>
      </div>
    </section>

    <footer class="evo__foot container">
      <MuseumButton v-if="active" :to="`/phone/${active.phoneId}`" variant="line">
        查看展品 · {{ active.phone.name }}
      </MuseumButton>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.evo {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__intro {
    margin-top: $sp-4;
    max-width: 44ch;
  }

  // 展台：大面积留白围绕真实图（规范 §94）
  &__stage {
    margin-top: $sp-7;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: $sp-5;
  }

  &__year {
    color: $c-text;
  }

  &__exhibit {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $sp-3;
  }

  &__photo {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 320px;
    width: min(80vw, 420px);

    :deep(img) {
      max-height: 100%;
      filter: drop-shadow(0 24px 60px rgba(0, 0, 0, 0.6));
    }

    :deep(.phone-photo__silhouette) {
      width: 120px;
    }
  }

  &__name {
    font-size: clamp(22px, 3.4vw, 36px);
    font-weight: 250;
    word-break: keep-all;
  }

  // 指标
  &__metrics {
    margin-top: $sp-7;
    width: min(560px, 100%);
  }

  &__metric-list {
    display: flex;
    flex-direction: column;
    gap: $sp-4;
  }

  &__metric-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;

    .label {
      font-size: 10px;
    }
  }

  &__metric-value {
    font-size: 15px;
    color: $c-text;
  }

  &__metric-bar {
    margin-top: $sp-1;
    height: 3px;
    background: $c-line-soft;
    overflow: hidden;
  }

  &__metric-fill {
    height: 100%;
    background: $c-accent;
    transform-origin: left;
    transition: transform 0.5s var(--ease-museum);
  }

  // 控制器
  &__control {
    margin-top: $sp-9;
    width: min(720px, 100%);
  }

  &__scale {
    display: flex;
    justify-content: space-between;
    color: $c-text-3;
    font-size: 10px;
    letter-spacing: 0.15em;
    margin-bottom: $sp-2;
  }

  &__range {
    width: 100%;
    appearance: none;
    height: 2px;
    background: $c-line;
    outline-offset: 6px;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: $c-text;
      border: 4px solid $c-bg;
      box-shadow: 0 0 0 1px $c-line;
      cursor: grab;
    }

    &::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: $c-text;
      border: none;
      cursor: grab;
    }
  }

  &__ticks {
    display: flex;
    justify-content: space-between;
    margin-top: $sp-2;
  }

  &__tick {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $c-text-3;

    &--passed {
      background: $c-accent;
    }
  }

  &__decades {
    margin-top: $sp-5;
    display: flex;
    flex-wrap: wrap;
    gap: $sp-2;
  }

  &__decade {
    @include label-style(10px);
    color: $c-text-3;
    padding: 6px 14px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    transition: color 0.3s var(--ease-museum), border-color 0.3s var(--ease-museum);

    &:hover {
      color: $c-text;
      border-color: $c-line;
    }

    &--next {
      color: $c-accent;
      border-color: rgba(184, 178, 164, 0.4);
    }
  }

  &__foot {
    margin-top: $sp-8;
    display: flex;
    justify-content: center;
  }
}

// 节点切换过渡（规范 §7）：scale / opacity，不用瞬跳
.evo-swap-enter-active,
.evo-swap-leave-active {
  transition: opacity 0.32s var(--ease-museum), transform 0.32s var(--ease-museum);
}

.evo-swap-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

.evo-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.99);
}
</style>
