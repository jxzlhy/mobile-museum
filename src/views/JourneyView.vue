<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { journeyService, type JourneyStopView } from '@/services/journeyService'
import { curatorService } from '@/services/curator/curatorService'
import { makeBlock } from '@/services/curator/types'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import { useReducedMotion } from '@/composables/useReducedMotion'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'

// Journey Viewer（V0.6 规范 §16–§18 / §43 / §66）：
// 01 / 05 · NEXT EXHIBIT →；Previous / Next / Skip / Exit；
// 不强制完成；进度存 museum.journeyProgress；?stop=n 恢复位置。

useStageScene(() => new AmbientScene())

const route = useRoute()
const router = useRouter()
const reduced = useReducedMotion()

const journey = ref<Awaited<ReturnType<typeof journeyService.getJourney>>>()
const status = ref<'loading' | 'ready' | 'error'>('loading')
const stopIndex = ref(0)

const stops = computed<JourneyStopView[]>(() => journey.value?.stopViews ?? [])
const current = computed(() => stops.value[stopIndex.value] ?? null)
const total = computed(() => stops.value.length)

async function load() {
  const id = String(route.params.id ?? '')
  const j = await journeyService.getJourney(id)
  if (!j) {
    status.value = 'error'
    document.title = '路线未找到 — 手机历史博物馆'
    return
  }
  journey.value = j
  status.value = 'ready'
  document.title = `${j.titleZh} · 策展路线 — 手机历史博物馆`

  // ?stop=n 恢复（§43）
  const qStop = route.query.stop ? Number(route.query.stop) : null
  const saved = journeyService.getProgress(id)?.currentStop
  stopIndex.value = qStop !== null && Number.isFinite(qStop)
    ? Math.max(0, Math.min(j.stops.length - 1, qStop))
    : saved
      ? Math.max(0, Math.min(j.stops.length - 1, Number(saved)))
      : 0
  journeyService.markStop(j.id, stopIndex.value)
}

function go(delta: -1 | 1) {
  const next = stopIndex.value + delta
  if (next < 0 || next >= total.value) return
  stopIndex.value = next
  if (journey.value) journeyService.markStop(journey.value.id, next)
}

function skip() {
  go(1)
}

function exit() {
  router.push('/explore/journeys')
}

/** V0.8 §40：把路线转成可继续编辑的展览（Intro + Exhibits + Timeline）。 */
function curateThisJourney() {
  const j = journey.value
  if (!j) return
  const ex = curatorService.create(j.titleZh, 'journey')
  if (!ex) return
  const blocks = [
    makeBlock('text', { text: j.description ?? '' }, 0),
    ...j.stops.map((s, i) => makeBlock('exhibit', { phoneId: s.phoneId ?? '', note: s.reason, displayMode: 'photo' }, 1 + i)),
    makeBlock('timeline', { mode: 'events' }, 90),
  ]
  curatorService.update(ex.id, {
    subtitle: j.title,
    coverPhoneId: j.stops[0]?.phoneId,
    blocks,
  })
  router.push(`/curator/${ex.id}`)
}

function toStop(i: number) {
  if (i < 0 || i >= total.value) return
  stopIndex.value = i
  if (journey.value) journeyService.markStop(journey.value.id, i)
}

onMounted(load)

watch(
  () => stopIndex.value,
  (v) => {
    if (route.name !== 'journey') return
    router.replace({ query: { ...route.query, stop: String(v) } })
  },
)
watch(
  () => route.params.id,
  (id, old) => {
    if (id && id !== old && route.name === 'journey') void load()
  },
)
</script>

<template>
  <div class="journey container">
    <p v-if="status === 'loading'" class="label" style="padding-block: 160px">正在展开路线……</p>

    <section v-else-if="status === 'error'" class="journey__missing glass-card">
      <p class="mono">JOURNEY UNAVAILABLE</p>
      <h1 class="heading-2" style="margin-block: 16px">这条路线暂时无法参观。</h1>
      <MuseumButton to="/explore/journeys" variant="cta">回到路线列表</MuseumButton>
    </section>

    <template v-else-if="journey">
      <header class="journey__head">
        <div class="journey__head-actions">
          <MuseumButton variant="line" @click="exit">← 退出路线</MuseumButton>
          <!-- V0.8 §40：Journey → Curator -->
          <MuseumButton variant="line" @click="curateThisJourney">CURATE THIS JOURNEY</MuseumButton>
        </div>
        <p class="label mono journey__kicker">CURATED JOURNEY · {{ journey.title }}</p>
        <h1 class="journey__title">{{ journey.titleZh }}</h1>
        <p class="journey__progress label mono">
          {{ String(stopIndex + 1).padStart(2, '0') }} / {{ String(total).padStart(2, '0') }}
          · 已参观 {{ journeyService.getProgress(journey.id)?.completedStops.length ?? 0 }} 站
        </p>
        <div class="journey__dots" role="tablist" aria-label="路线站点">
          <button
            v-for="(s, i) in stops"
            :key="i"
            class="journey__dot"
            :class="{ 'journey__dot--on': i === stopIndex, 'journey__dot--done': i < stopIndex }"
            :aria-label="`第 ${i + 1} 站：${s.phone?.name ?? ''}`"
            @click="toStop(i)"
          ></button>
        </div>
      </header>

      <!-- 当前站 -->
      <article v-if="current" class="journey__stage">
        <div class="journey__stage-media">
          <PhonePhoto v-if="current.phone" :phone="current.phone" class="journey__photo" />
        </div>
        <div class="journey__stage-body">
          <p class="mono journey__stop-no">STOP {{ String(stopIndex + 1).padStart(2, '0') }} / {{ String(total).padStart(2, '0') }}</p>
          <p class="mono journey__year">{{ current.phone?.releaseYear }}</p>
          <h2 class="journey__name">{{ current.phone?.name }}</h2>
          <p v-if="current.phone?.tagline" class="body-lg journey__tagline">{{ current.phone.tagline }}</p>
          <p class="journey__reason body-md">
            <span class="label journey__why">WHY THIS STOP · 为什么在这里</span>
            {{ current.stop.reason }}
          </p>
          <div class="journey__nav">
            <button class="journey__navbtn" :disabled="stopIndex === 0" @click="go(-1)">← PREVIOUS</button>
            <button v-if="stopIndex < total - 1" class="journey__navbtn journey__navbtn--primary" @click="go(1)">
              NEXT EXHIBIT →
            </button>
            <MuseumButton v-else to="/explore/journeys" variant="cta">路线完成 · 返回</MuseumButton>
            <button v-if="stopIndex < total - 1" class="journey__navbtn journey__navbtn--skip" @click="skip">SKIP</button>
          </div>
          <router-link v-if="current.phone" :to="`/museum/exhibit/${current.phone.id}`" class="journey__profile label">
            深度观展这件展品 →
          </router-link>
        </div>
      </article>

      <!-- 全部站点概览 -->
      <ol class="journey__all">
        <li v-for="(s, i) in stops" :key="i">
          <button class="journey__all-row" :class="{ 'journey__all-row--on': i === stopIndex }" @click="toStop(i)">
            <span class="mono journey__all-index">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="journey__all-name">{{ s.phone?.name }}</span>
            <span class="label journey__all-year">{{ s.phone?.releaseYear }}</span>
          </button>
        </li>
      </ol>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.journey {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head-actions {
    display: flex;
    gap: $sp-2;
    flex-wrap: wrap;
  }

  &__kicker {
    margin-top: $sp-4;
    font-size: 9px;
    color: $c-text-3;
    letter-spacing: 0.2em;
  }

  &__title {
    margin-top: $sp-2;
    font-size: clamp(26px, 4vw, 40px);
    font-weight: 250;
    word-break: keep-all;
  }

  &__progress {
    margin-top: $sp-2;
    font-size: 10px;
    color: $c-accent;
    letter-spacing: 0.2em;
  }

  &__dots {
    margin-top: $sp-3;
    display: flex;
    gap: $sp-2;
  }

  &__dot {
    width: 28px;
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    transition: background 0.3s var(--ease-museum);

    &--done {
      background: rgba(184, 178, 164, 0.5);
    }

    &--on {
      background: $c-accent;
    }
  }

  &__stage {
    margin-top: $sp-7;
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-6;

    @include desktop {
      grid-template-columns: minmax(240px, 320px) 1fr;
      align-items: center;
    }
  }

  &__stage-media {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: $sp-6;
    border: 1px solid $c-line-soft;
    border-radius: 18px;
    background: radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, 0.04), transparent 70%);
    min-height: 280px;
  }

  &__photo {
    width: 150px;
    display: flex;
    align-items: center;
  }

  &__stop-no {
    font-size: 10px;
    letter-spacing: 0.25em;
    color: $c-text-3;
  }

  &__year {
    margin-top: $sp-3;
    font-size: 13px;
    color: $c-accent;
    letter-spacing: 0.25em;
  }

  &__name {
    margin-top: $sp-1;
    font-size: clamp(26px, 4vw, 44px);
    font-weight: 250;
    word-break: keep-all;
  }

  &__tagline {
    margin-top: $sp-2;
    color: $c-text-2;
  }

  &__reason {
    margin-top: $sp-4;
    padding: $sp-4 $sp-5;
    border-left: 2px solid $c-accent;
    color: $c-text-2;
    line-height: 1.8;
    max-width: 52ch;
  }

  &__why {
    display: block;
    margin-bottom: $sp-1;
    font-size: 9px;
    color: $c-text-3;
  }

  &__nav {
    margin-top: $sp-5;
    display: flex;
    align-items: center;
    gap: $sp-3;
    flex-wrap: wrap;
  }

  &__navbtn {
    padding: $sp-3 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    @include label-style(10px);
    color: $c-text-2;
    transition: border-color 0.3s var(--ease-museum), color 0.3s var(--ease-museum);

    &:hover:not(:disabled) {
      color: $c-text;
      border-color: $c-line;
    }

    &:disabled {
      opacity: 0.3;
    }

    &--primary {
      border-color: rgba(184, 178, 164, 0.55);
      color: $c-accent;
    }

    &--skip {
      border-color: transparent;
      color: $c-text-3;
    }
  }

  &__profile {
    display: inline-block;
    margin-top: $sp-4;
    color: $c-text-2;
    border-bottom: 1px solid $c-line;
    padding-bottom: 2px;

    &:hover {
      color: $c-accent;
    }
  }

  &__all {
    margin-top: $sp-8;
    border-top: 1px solid $c-line-soft;
  }

  &__all-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-3 $sp-2;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    text-align: left;

    &--on {
      .journey__all-name {
        color: $c-accent;
      }
    }
  }

  &__all-index {
    width: 32px;
    font-size: 10px;
    color: $c-text-3;
  }

  &__all-name {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__all-year {
    margin-left: auto;
    font-size: 9px;
    color: $c-text-3;
  }

  &__missing {
    margin-top: $sp-8;
    padding: $sp-7 $sp-6;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-2;

    .mono {
      font-size: 11px;
      letter-spacing: 0.2em;
      color: $c-text-3;
    }
  }
}
</style>
