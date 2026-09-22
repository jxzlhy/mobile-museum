<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { journeyService, type JourneyProgress } from '@/services/journeyService'
import { getJourneys, type DiscoveryPath } from '@/data/journeys'
import MuseumButton from '@/components/common/MuseumButton.vue'

// MY JOURNEYS（V0.6 规范 §53–§55）：
// FROM BUTTONS TO TOUCH · 3 / 5 —— 点击后恢复上次位置。
// 与 COLLECTION / DISCOVERY / MEMORY / EXHIBITION 严格分离（§55）。

const journeys = ref<DiscoveryPath[]>([])
const progress = ref<Record<string, JourneyProgress>>({})

onMounted(() => {
  journeys.value = getJourneys()
  progress.value = journeyService.getAllProgress()
})

function resumeAt(j: DiscoveryPath): number | null {
  const p = progress.value[j.id]
  if (!p?.currentStop) return null
  return Math.min(Number(p.currentStop), j.stops.length - 1)
}
</script>

<template>
  <section class="myj" aria-label="我的路线">
    <p class="label">MY JOURNEYS · 我的路线</p>

    <p v-if="journeys.every((j) => !progress[j.id])" class="myj__empty mono">
      还没有开始任何路线 —— 去「策展路线」挑一条出发。
    </p>

    <ul v-else class="myj__list">
      <li v-for="j in journeys" :key="j.id">
        <article v-if="progress[j.id]" class="myj__item glass-card">
          <div class="myj__info">
            <p class="myj__title">{{ j.titleZh }}</p>
            <p class="mono myj__count">
              {{ progress[j.id]!.completedStops.length }} / {{ j.stops.length }}
            </p>
          </div>
          <MuseumButton :to="`/explore/journeys/${j.id}${resumeAt(j) !== null ? `?stop=${resumeAt(j)}` : ''}`" variant="line">
            {{ resumeAt(j) !== null ? `从第 ${resumeAt(j)! + 1} 站继续` : '查看' }}
          </MuseumButton>
        </article>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.myj {
  margin-top: $sp-8;

  &__empty {
    margin-top: $sp-3;
    font-size: 10px;
    color: $c-text-3;
    padding: $sp-4;
    border: 1px dashed $c-line-soft;
    border-radius: 14px;
    text-align: center;
    word-break: keep-all;
  }

  &__list {
    margin-top: $sp-3;
    display: flex;
    flex-direction: column;
    gap: $sp-3;
  }

  &__item {
    padding: $sp-4 $sp-5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $sp-4;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 16px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__count {
    margin-top: $sp-1;
    font-size: 11px;
    color: $c-accent;
    letter-spacing: 0.2em;
  }
}
</style>
