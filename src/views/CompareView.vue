<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { comparisonService, type ComparisonResult } from '@/services/comparisonService'
import AddToExhibition from '@/components/curator/AddToExhibition.vue'
import { phoneService } from '@/services/phoneService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import { formFactorLabel } from '@/data/formFactors'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import type { Phone } from '@/data/types'

// COMPARE（V0.3 §25–§36 / §80–§81）：真实设备 VS 真实设备，
// 视觉比例优先，WHAT CHANGED 解释层收尾。

const route = useRoute()
const router = useRouter()

const phones = ref<Phone[]>([])
const left = ref<Phone | null>(null)
const right = ref<Phone | null>(null)
const result = computed<ComparisonResult | null>(() =>
  left.value && right.value ? comparisonService.comparePhones(left.value, right.value) : null,
)
const sameDevice = computed(() => left.value && right.value && left.value.id === right.value.id)
const presets = ref<Array<{ label: string; left: string; right: string }>>([])

useStageScene(() => new AmbientScene())

onMounted(async () => {
  phones.value = await phoneService.getPhones()
  presets.value = await comparisonService.getPresets()
  // URL 状态恢复（§81）
  const l = String(route.query.left ?? '')
  const r = String(route.query.right ?? '')
  left.value = phones.value.find((p) => p.id === l) ?? phones.value.find((p) => p.id === 'apple-iphone') ?? null
  right.value = phones.value.find((p) => p.id === r) ?? phones.value.find((p) => p.id === 'samsung-galaxy-fold') ?? null
})

function syncUrl() {
  if (left.value && right.value) {
    router.replace({ query: { left: left.value.id, right: right.value.id } }).catch(() => {})
  }
}
watch([left, right], syncUrl)

function swap() {
  const l = left.value
  left.value = right.value
  right.value = l
}

const barWidth = (v: number | string | undefined, max?: number) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!Number.isFinite(n) || !max) return 0
  return Math.max(0.04, n / max)
}
</script>

<template>
  <div class="page compare container">
    <header class="compare__head">
      <p class="label">COMPARE · 对比实验室</p>
      <h1 class="heading-1" style="margin-top: 16px">对比</h1>
      <p class="body-lg compare__intro">选两台设备，看它们之间隔着多少年的变化。</p>
    </header>

    <!-- 预设（§89） -->
    <div class="compare__presets">
      <button
        v-for="p in presets"
        :key="p.label"
        class="compare__preset"
        :class="{ 'compare__preset--on': left?.id === p.left && right?.id === p.right }"
        @click="left = phones.find((x) => x.id === p.left) ?? null; right = phones.find((x) => x.id === p.right) ?? null"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- 选择器（Glass 控制层） -->
    <GlassCard class="compare__selectors">
      <label class="compare__select-wrap">
        <span class="label">设备 A</span>
        <select v-model.number="left" class="compare__select">
          <option v-for="p in phones" :key="p.id" :value="p">{{ p.name }}（{{ p.releaseYear }}）</option>
        </select>
      </label>
      <button class="compare__swap mono" aria-label="交换 A / B" @click="swap">⇄</button>
      <label class="compare__select-wrap">
        <span class="label">设备 B</span>
        <select v-model.number="right" class="compare__select">
          <option v-for="p in phones" :key="p.id" :value="p">{{ p.name }}（{{ p.releaseYear }}）</option>
        </select>
      </label>
    </GlassCard>

    <p v-if="sameDevice" class="compare__notice label">SAME DEVICE · 请选择两台不同的展品</p>

    <!-- 第一屏：真实设备 VS 真实设备（§27/§68） -->
    <section v-if="result && !sameDevice" class="compare__stage">
      <div class="compare__side">
        <p class="compare__side-year year-mid">{{ result.left.releaseYear }}</p>
        <div class="compare__side-photo"><PhonePhoto :phone="result.left" mark-missing /></div>
        <h2 class="compare__side-name">{{ result.left.name }}</h2>
        <p class="label">{{ result.left.brandName }} · {{ formFactorLabel(result.left.formFactor) }}</p>
      </div>

      <div class="compare__vs" aria-hidden="true">
        <span class="compare__vs-text mono">VS</span>
        <span class="compare__vs-years mono">{{ result.yearsApart }} 年<br />之变</span>
      </div>

      <div class="compare__side">
        <p class="compare__side-year year-mid">{{ result.right.releaseYear }}</p>
        <div class="compare__side-photo"><PhonePhoto :phone="result.right" mark-missing /></div>
        <h2 class="compare__side-name">{{ result.right.name }}</h2>
        <p class="label">{{ result.right.brandName }} · {{ formFactorLabel(result.right.formFactor) }}</p>
      </div>
    </section>

    <!-- 指标（视觉比例优先，§29） -->
    <section v-if="result && !sameDevice" class="compare__metrics">
      <div v-for="m in result.metrics" :key="m.key" class="compare__metric">
        <p class="label compare__metric-label">{{ m.label }}</p>

        <template v-if="m.visualType === 'bar'">
          <div class="compare__bars">
            <div class="compare__bar-row">
              <span class="mono compare__bar-value">{{ m.leftValue ?? '未记载' }}</span>
              <div class="compare__bar"><div class="compare__bar-fill compare__bar-fill--a" :style="{ transform: `scaleX(${barWidth(m.leftValue, m.max)})` }"></div></div>
            </div>
            <div class="compare__bar-row">
              <span class="mono compare__bar-value">{{ m.rightValue ?? '未记载' }}</span>
              <div class="compare__bar"><div class="compare__bar-fill compare__bar-fill--b" :style="{ transform: `scaleX(${barWidth(m.rightValue, m.max)})` }"></div></div>
            </div>
          </div>
        </template>

        <template v-else-if="m.visualType === 'timeline'">
          <div class="compare__timeline">
            <span class="mono">{{ m.leftValue }}</span>
            <span class="compare__timeline-line"></span>
            <span class="label compare__timeline-gap">{{ result.yearsApart }} 年之变</span>
            <span class="compare__timeline-line"></span>
            <span class="mono">{{ m.rightValue }}</span>
          </div>
        </template>

        <template v-else>
          <div class="compare__category">
            <span class="compare__cat-a">{{ m.leftValue }}</span>
            <span class="mono compare__cat-sep">/</span>
            <span class="compare__cat-b">{{ m.rightValue }}</span>
          </div>
        </template>
      </div>
    </section>

    <!-- WHAT CHANGED（§32） -->
    <section v-if="result && !sameDevice" class="compare__changed">
      <p class="label compare__changed-head">WHAT CHANGED? · 变了什么</p>
      <p v-for="line in result.summary" :key="line" class="compare__changed-line">{{ line }}</p>
    </section>

    <!-- V0.8 §42：Comparison → Curator -->
    <section v-if="result && !sameDevice" class="compare__curate">
      <AddToExhibition
        block-type="comparison"
        :block-data="() => ({ leftPhoneId: result!.left.id, rightPhoneId: result!.right.id, label: `${result!.left.name} vs ${result!.right.name}` })"
        label="ADD TO EXHIBITION · 把这次对比收进你的展览"
      />
    </section>

    <p class="compare__note label">* 展品标注「图版待补」表示该设备暂无经验证的真实影像资料。</p>
  </div>
</template>

<style lang="scss" scoped>
.compare {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__intro {
    margin-top: $sp-4;
    max-width: 40ch;
  }

  &__presets {
    margin-top: $sp-6;
    display: flex;
    flex-wrap: wrap;
    gap: $sp-2;
  }

  &__preset {
    @include label-style(10px);
    color: $c-text-3;
    padding: 6px 14px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    word-break: keep-all;
    transition: color 0.3s var(--ease-museum), border-color 0.3s var(--ease-museum);

    &:hover { color: $c-text; border-color: $c-line; }

    &--on {
      color: #0a0a0a;
      background: rgba(255, 255, 255, 0.9);
      border-color: transparent;
    }
  }

  &__selectors {
    margin-top: $sp-5;
    padding: $sp-4 $sp-5;
    display: flex;
    align-items: center;
    gap: $sp-4;
    flex-wrap: wrap;
  }

  &__select-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 200px;
  }

  &__select {
    background: transparent;
    border: none;
    color: $c-text;
    font-size: 15px;
    padding-block: $sp-1;
    outline: none;
    word-break: keep-all;

    option {
      background: #111;
      color: $c-text;
    }
  }

  &__swap {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid $c-line;
    color: $c-text;
    flex-shrink: 0;
  }

  &__notice {
    margin-top: $sp-4;
    color: $c-accent;
  }

  // 第一屏
  &__stage {
    margin-top: $sp-8;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: $sp-4;
    align-items: start;

    @media (max-width: 767px) {
      grid-template-columns: 1fr;
      justify-items: center;
      gap: $sp-6;
    }
  }

  &__side {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: $sp-2;

    &-year {
      color: $c-accent;
    }

    &-photo {
      height: 300px;
      width: min(72vw, 320px);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-block: $sp-3;

      :deep(img) {
        max-height: 100%;
        filter: drop-shadow(0 20px 46px rgba(0, 0, 0, 0.6));
      }

      :deep(.phone-photo__silhouette) {
        width: 90px;
      }
    }

    &-name {
      font-size: clamp(18px, 2.4vw, 26px);
      font-weight: 300;
      word-break: keep-all;
    }
  }

  &__vs {
    align-self: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $sp-2;

    &-text {
      font-size: clamp(22px, 3vw, 34px);
      font-weight: 200;
      letter-spacing: 0.2em;
      color: $c-text;
    }

    &-years {
      font-size: 10px;
      color: $c-text-3;
      text-align: center;
      line-height: 1.8;
    }
  }

  // 指标
  &__metrics {
    margin-top: $sp-9;
    display: flex;
    flex-direction: column;
    gap: $sp-7;
    width: min(680px, 100%);
    margin-inline: auto;
  }

  &__metric-label {
    font-size: 10px;
    margin-bottom: $sp-3;
  }

  &__bars {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
  }

  &__bar-row {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: $sp-3;
    align-items: center;
  }

  &__bar-value {
    font-size: 12px;
    color: $c-text-2;
    text-align: right;
    word-break: keep-all;
  }

  &__bar {
    height: 6px;
    background: $c-line-soft;
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    transform-origin: left;
    transition: transform 0.6s var(--ease-museum);

    &--a { background: rgba(255, 255, 255, 0.85); }
    &--b { background: $c-accent; }
  }

  &__timeline {
    display: flex;
    align-items: center;
    gap: $sp-3;

    span:first-child,
    span:last-child {
      font-size: 15px;
      color: $c-text;
    }
  }

  &__timeline-line {
    flex: 1;
    height: 1px;
    background: $c-line;
  }

  &__timeline-gap {
    font-size: 10px;
    color: $c-accent;
    white-space: nowrap;
  }

  &__category {
    display: flex;
    align-items: baseline;
    gap: $sp-3;
    flex-wrap: wrap;
    word-break: keep-all;
  }

  &__cat-a {
    font-size: 16px;
    color: $c-text;
  }

  &__cat-sep {
    color: $c-text-3;
  }

  &__cat-b {
    font-size: 16px;
    color: $c-accent;
  }

  // WHAT CHANGED
  &__changed {
    margin-top: $sp-9;
    padding: $sp-8 0;

    &-head {
      margin-bottom: $sp-5;
      font-size: 10px;
    }
  }

  &__changed-line {
    font-size: clamp(18px, 2.8vw, 30px);
    font-weight: 200;
    line-height: 1.5;
    color: $c-text-2;
    max-width: 30ch;
    word-break: keep-all;
  }

  &__curate {
    margin-top: $sp-6;
    padding: $sp-5 $sp-6;
    border: 1px solid $c-line-soft;
    border-radius: 16px;
  }

  &__note {
    margin-top: $sp-8;
    font-size: 9px;
  }
}
</style>
