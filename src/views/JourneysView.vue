<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { journeyService, type JourneyProgress } from '@/services/journeyService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import MuseumButton from '@/components/common/MuseumButton.vue'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import type { DiscoveryPath } from '@/data/journeys'
import type { Phone } from '@/data/types'

// Curated Journeys（V0.6 规范 §14–§15 / §43 / §54 / §66）：
// Story 讲主题，Journey 带参观者连续走进一组展品。
// 有进度则显示 n / N 并支持恢复上次位置。

useStageScene(() => new AmbientScene())

interface JourneyRow extends DiscoveryPath {
  stopPhones: Phone[]
}

const journeys = ref<JourneyRow[]>([])
const progress = ref<Record<string, JourneyProgress>>({})

onMounted(async () => {
  journeys.value = await journeyService.getJourneys()
  progress.value = journeyService.getAllProgress()
})

function progressOf(j: JourneyRow): { done: number; total: number; resumeAt: number | null } {
  const p = progress.value[j.id]
  if (!p) return { done: 0, total: j.stops.length, resumeAt: null }
  const resumeAt = p.currentStop ? Math.min(Number(p.currentStop), j.stops.length - 1) : null
  return { done: p.completedStops.length, total: j.stops.length, resumeAt }
}
</script>

<template>
  <div class="journeys container">
    <header class="journeys__head">
      <p class="label">CURATED JOURNEYS · 策展路线</p>
      <h1 class="heading-1" style="margin-top: 16px">跟着一条线<br />走完一段历史</h1>
      <p class="body-lg journeys__intro">每条路线都由博物馆策展：起点、顺序、理由，全部写在明面上。</p>
    </header>

    <p v-if="journeys.length === 0" class="mono journeys__empty">JOURNEY UNAVAILABLE</p>

    <nav class="journeys__list">
      <article v-for="j in journeys" :key="j.id" class="journeys__item glass-card">
        <header class="journeys__item-head">
          <div>
            <p class="label mono">{{ j.title }} · {{ j.basis.toUpperCase() }}</p>
            <h2 class="journeys__title">{{ j.titleZh }}</h2>
            <p v-if="j.description" class="body-md journeys__desc">{{ j.description }}</p>
          </div>
          <MuseumButton :to="`/explore/journeys/${j.id}`" variant="cta">
            {{ progress[j.id] ? '继续参观' : 'START JOURNEY' }}
          </MuseumButton>
        </header>

        <div class="journeys__meta label mono">
          {{ j.stops.length }} EXHIBITS
          <template v-if="progress[j.id]"> · {{ progressOf(j).done }} / {{ progressOf(j).total }}</template>
          <template v-if="progressOf(j).resumeAt !== null"> · 从第 {{ progressOf(j).resumeAt! + 1 }} 站恢复</template>
        </div>

        <!-- 路线预览 -->
        <ol class="journeys__stops">
          <li v-for="(s, i) in j.stopPhones" :key="s?.id ?? i" class="journeys__stop">
            <span class="mono journeys__stop-index">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="journeys__stop-art"><PhonePhoto v-if="s" :phone="s" thumb /></span>
            <span class="journeys__stop-name">{{ s?.name ?? '—' }}</span>
            <span class="label journeys__stop-year">{{ s?.releaseYear }}</span>
          </li>
        </ol>
      </article>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
.journeys {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head {
    .label {
      margin-bottom: $sp-2;
    }
  }

  &__intro {
    margin-top: $sp-3;
    color: $c-text-2;
  }

  &__empty {
    margin-top: $sp-7;
    font-size: 11px;
    letter-spacing: 0.2em;
    color: $c-text-3;
    text-align: center;
    padding: $sp-6;
    border: 1px dashed $c-line-soft;
    border-radius: 14px;
  }

  &__list {
    margin-top: $sp-7;
    display: flex;
    flex-direction: column;
    gap: $sp-4;
  }

  &__item {
    padding: $sp-6;
  }

  &__item-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $sp-4;
    flex-wrap: wrap;

    .label {
      font-size: 9px;
      color: $c-text-3;
      letter-spacing: 0.2em;
    }
  }

  &__title {
    margin-top: $sp-1;
    font-size: clamp(22px, 3.4vw, 32px);
    font-weight: 250;
    word-break: keep-all;
  }

  &__desc {
    margin-top: $sp-2;
    color: $c-text-2;
    max-width: 44ch;
  }

  &__meta {
    margin-top: $sp-3;
    font-size: 10px;
    color: $c-accent;
    letter-spacing: 0.18em;
  }

  &__stops {
    margin-top: $sp-4;
    border-top: 1px solid $c-line-soft;
  }

  &__stop {
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding-block: $sp-2;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  &__stop-index {
    width: 28px;
    font-size: 10px;
    color: $c-text-3;
    flex-shrink: 0;
  }

  &__stop-art {
    width: 30px;
    height: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  &__stop-name {
    font-size: 14px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__stop-year {
    margin-left: auto;
    font-size: 9px;
    color: $c-text-3;
  }
}
</style>
