<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { timeMachineService } from '@/services/timeMachineService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import type { Phone } from '@/data/types'

// TIME MACHINE 首页（V0.7 规范 §4–§8 / §55 / §104）：
// 1973 ─── 2026 横向时间轴：拖动 / 点选年份；Era Snapshot（§8，复用 Context）；
// CONTINUE YOUR VISIT（§55）。入口在 Explore（§4），不加导航 Tab。

useStageScene(() => new AmbientScene())

const router = useRouter()

const sceneYears = timeMachineService.getYears()
const scenes = timeMachineService.getAllScenes()
const MIN_YEAR = 1973
const MAX_YEAR = 2026

const cursorYear = ref(sceneYears.includes(2007) ? 2007 : sceneYears[0]!)
const lastYear = timeMachineService.getLastSceneYear()
const era = ref<Awaited<ReturnType<typeof timeMachineService.getEra>>>(null)
const eraPhones = ref<Phone[]>([])

const pct = computed(() => ((cursorYear.value - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100)

/** 就近年份吸附到 Era 快照（§7：默认使用年代桶）。 */
async function snapToNearestScene() {
  const nearest = sceneYears.reduce((a, b) => (Math.abs(b - cursorYear.value) < Math.abs(a - cursorYear.value) ? b : a))
  cursorYear.value = nearest
  await loadEra()
}

async function loadEra() {
  era.value = await timeMachineService.getEra(cursorYear.value)
  const all = await import('@/services/phoneService').then((m) => m.phoneService.getPhones())
  const ids = new Set((era.value?.phones ?? []).map((p) => p.id))
  eraPhones.value = all.filter((p) => ids.has(p.id)).slice(0, 5)
}

function onSlider(e: Event) {
  cursorYear.value = Number((e.target as HTMLInputElement).value)
}

function enterScene(year?: number) {
  router.push(`/museum/time-machine/${year ?? cursorYear.value}`)
}

onMounted(loadEra)
</script>

<template>
  <div class="tm container">
    <header class="tm__head">
      <p class="label">TIME MACHINE · 时间机器</p>
      <h1 class="heading-1" style="margin-top: 16px">回到那个时代</h1>
      <p class="body-lg tm__intro">拖动年份，走进一座按年代重构的数字展厅——所有陈设都来自档案。</p>

      <div v-if="lastYear" class="tm__resume glass-card">
        <p class="label">CONTINUE YOUR VISIT</p>
        <button class="tm__resume-btn" @click="enterScene(lastYear)">{{ lastYear }} →</button>
      </div>
    </header>

    <!-- 时间轴（§5–§6） -->
    <section class="tm__slider-wrap" aria-label="时间轴">
      <div class="tm__scale mono" aria-hidden="true">
        <span>1973</span><span>1990</span><span>2007</span><span>2026</span>
      </div>
      <input
        class="tm__slider"
        type="range"
        :min="MIN_YEAR"
        :max="MAX_YEAR"
        step="1"
        :value="cursorYear"
        aria-label="选择年份"
        @input="onSlider"
        @change="snapToNearestScene"
      />
      <div class="tm__markers">
        <button
          v-for="y in sceneYears"
          :key="y"
          class="tm__marker mono"
          :class="{ 'tm__marker--on': y === cursorYear }"
          :style="{ left: `${((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%` }"
          @click="cursorYear = y; enterScene(y)"
        >
          {{ y }}
        </button>
      </div>
      <p class="mono tm__cursor-year">{{ cursorYear }}</p>
    </section>

    <!-- Era Snapshot（§8） -->
    <section v-if="era && !era.limited" class="tm__era">
      <p class="label mono">ERA SNAPSHOT · {{ cursorYear }}</p>
      <h2 class="heading-2 tm__era-title">{{ cursorYear }} 的世界</h2>
      <p v-if="era.networks.length" class="label mono tm__era-net">{{ era.networks.join(' · ') }}</p>

      <div v-if="eraPhones.length" class="tm__era-phones">
        <button v-for="p in eraPhones" :key="p.id" class="tm__era-phone" @click="enterScene()">
          <span class="tm__era-art"><PhonePhoto :phone="p" thumb /></span>
          <span class="tm__era-name">{{ p.name }}</span>
          <span class="label tm__era-year">{{ p.releaseYear }}</span>
        </button>
      </div>
      <div v-if="era.culturalNotes.length" class="tm__era-notes">
        <p v-for="(n, i) in era.culturalNotes" :key="i" class="body-md">{{ n }}</p>
      </div>
    </section>

    <!-- 场景列表（§104） -->
    <section class="tm__scenes">
      <p class="label tm__scenes-head">HISTORICAL SCENES · 六个历史场景</p>
      <div class="tm__scene-grid">
        <button v-for="s in scenes" :key="s.id" class="tm__scene" @click="enterScene(s.year)">
          <span class="mono tm__scene-year">{{ s.year }}</span>
          <span class="tm__scene-title">{{ s.titleZh }}</span>
          <span class="label tm__scene-sub">{{ s.title }} · {{ s.sceneType.toUpperCase() }}</span>
          <span class="mono tm__scene-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.tm {
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
    max-width: 40ch;
  }

  &__resume {
    margin-top: $sp-5;
    padding: $sp-4 $sp-5;
    display: inline-flex;
    align-items: center;
    gap: $sp-4;

    .label {
      font-size: 9px;
      color: $c-text-3;
    }
  }

  &__resume-btn {
    font-size: 20px;
    color: $c-accent;
    font-weight: 350;
  }

  &__slider-wrap {
    margin-top: $sp-8;
    position: relative;
    padding-top: $sp-4;
  }

  &__scale {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: $c-text-3;
    margin-bottom: $sp-1;
  }

  &__slider {
    width: 100%;
    accent-color: #b8b2a4;
    height: 32px;
    cursor: ew-resize;
  }

  &__markers {
    position: relative;
    height: 34px;
    margin-top: $sp-1;
  }

  &__marker {
    position: absolute;
    transform: translateX(-50%);
    font-size: 10px;
    padding: 5px 10px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-3;
    transition: color 0.3s var(--ease-museum), border-color 0.3s var(--ease-museum);

    &:hover {
      color: $c-text;
    }

    &--on {
      color: $c-accent;
      border-color: rgba(184, 178, 164, 0.55);
    }
  }

  &__cursor-year {
    margin-top: $sp-3;
    font-size: clamp(34px, 7vw, 64px);
    color: $c-accent;
    line-height: 1;
  }

  &__era {
    margin-top: $sp-7;
  }

  &__era-title {
    margin-top: $sp-2;
    word-break: keep-all;
  }

  &__era-net {
    margin-top: $sp-2;
    font-size: 10px;
    color: $c-text-3;
  }

  &__era-phones {
    margin-top: $sp-4;
    display: flex;
    gap: $sp-3;
    overflow-x: auto;
    padding-bottom: $sp-2;
  }

  &__era-phone {
    flex: 0 0 auto;
    width: 112px;
    display: flex;
    flex-direction: column;
    gap: $sp-1;
    padding: $sp-3;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
    text-align: left;
    transition: border-color 0.3s var(--ease-museum);

    &:hover {
      border-color: $c-line;
    }
  }

  &__era-art {
    height: 64px;
    display: flex;
    align-items: center;
  }

  &__era-name {
    font-size: 12px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__era-year {
    font-size: 9px;
    color: $c-text-3;
  }

  &__era-notes {
    margin-top: $sp-4;
    display: flex;
    flex-direction: column;
    gap: $sp-2;

    .body-md {
      color: $c-text-2;
    }
  }

  &__scenes {
    margin-top: $sp-8;
  }

  &__scenes-head {
    font-size: 10px;
    color: $c-text-3;
    margin-bottom: $sp-3;
  }

  &__scene-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-3;

    @include desktop {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__scene {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-1;
    padding: $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 16px;
    text-align: left;
    transition: border-color 0.35s var(--ease-museum), background 0.35s var(--ease-museum);

    &:hover {
      border-color: $c-line;
      background: rgba(255, 255, 255, 0.03);

      .tm__scene-arrow {
        transform: translateX(5px);
        color: $c-accent;
      }
    }
  }

  &__scene-year {
    font-size: 12px;
    color: $c-accent;
    letter-spacing: 0.2em;
  }

  &__scene-title {
    font-size: 19px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__scene-sub {
    font-size: 9px;
    color: $c-text-3;
  }

  &__scene-arrow {
    margin-top: $sp-2;
    color: $c-text-3;
    transition: transform 0.35s var(--ease-museum), color 0.35s var(--ease-museum);
  }
}
</style>
