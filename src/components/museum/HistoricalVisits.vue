<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { timeMachineService } from '@/services/timeMachineService'
import { getSceneById } from '@/data/scenes'
import MuseumButton from '@/components/common/MuseumButton.vue'

// HISTORICAL VISITS（V0.7 规范 §51–§53 / §96）：
// 最近访问的历史场景（最多 5 个）+ 由真实访问生成的个人时间线。
// 不是游戏化（§54）—— 只是参观记录。

interface Visit {
  sceneId: string
  year: number
  titleZh: string
  visitedAt: number
}

const visits = ref<Visit[]>([])

onMounted(() => {
  visits.value = timeMachineService
    .getRecentSceneVisits()
    .map((v) => {
      const s = getSceneById(v.sceneId)
      return s ? { sceneId: v.sceneId, year: s.year, titleZh: s.titleZh, visitedAt: v.visitedAt } : null
    })
    .filter((v): v is Visit => v !== null)
    .slice(0, 5)
})
</script>

<template>
  <section class="hvisits" aria-label="历史访问">
    <p class="label hvisits__head">HISTORICAL VISITS · 最近的历史场景</p>

    <p v-if="visits.length === 0" class="mono hvisits__empty">还没有穿越记录 —— 去「时间机器」选一个年份出发。</p>

    <template v-else>
      <!-- MY HISTORICAL JOURNEY：由实际访问生成（§53） -->
      <div class="hvisits__timeline" aria-label="我的历史时间线">
        <span v-for="(v, i) in visits" :key="v.sceneId" class="hvisits__year-item">
          <span class="mono hvisits__year">{{ v.year }}</span>
          <span v-if="i < visits.length - 1" class="hvisits__dash" aria-hidden="true">—</span>
        </span>
      </div>

      <router-link
        v-for="v in visits"
        :key="v.sceneId"
        :to="`/museum/time-machine/${v.year}`"
        class="hvisits__row"
        data-cursor="回到场景"
      >
        <span class="mono hvisits__row-year">{{ v.year }}</span>
        <span class="hvisits__row-title">{{ v.titleZh }}</span>
        <span class="hvisits__row-arrow mono" aria-hidden="true">→</span>
      </router-link>
    </template>

    <div class="hvisits__cta">
      <MuseumButton to="/museum/time-machine" variant="line">TIME MACHINE · 时间机器</MuseumButton>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.hvisits {
  margin-top: $sp-8;

  &__head {
    font-size: 10px;
    margin-bottom: $sp-3;
  }

  &__empty {
    font-size: 10px;
    color: $c-text-3;
    padding: $sp-4;
    border: 1px dashed $c-line-soft;
    border-radius: 14px;
    text-align: center;
    word-break: keep-all;
  }

  &__timeline {
    display: flex;
    align-items: baseline;
    gap: $sp-2;
    flex-wrap: wrap;
    margin-bottom: $sp-3;
  }

  &__year {
    font-size: clamp(18px, 3vw, 26px);
    color: $c-accent;
  }

  &__dash {
    color: $c-text-3;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-3 $sp-2;
    border-top: 1px solid $c-line-soft;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }
  }

  &__row-year {
    width: 52px;
    font-size: 12px;
    color: $c-text-3;
  }

  &__row-title {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__row-arrow {
    margin-left: auto;
    color: $c-text-3;
  }

  &__cta {
    margin-top: $sp-4;
  }
}
</style>
