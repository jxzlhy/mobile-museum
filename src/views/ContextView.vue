<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contextService, type ContextView } from '@/services/contextService'
import { phoneService } from '@/services/phoneService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import type { Phone } from '@/data/types'

// Historical Context（V0.6 规范 §19–§21 / §44 / §66）：
// 展品所处的时代环境。没有资料的维度就缺省，
// 不虚构「当时所有人都……」式表达。

useStageScene(() => new AmbientScene())

const route = useRoute()
const router = useRouter()

const context = ref<ContextView | null>(null)
const phones = ref<Phone[]>([])
const status = ref<'loading' | 'ready' | 'limited'>('loading')
const years = contextService.getAvailableYears()

const year = computed(() => {
  const y = Number(route.params.year)
  return Number.isFinite(y) ? y : 2007
})

async function load() {
  status.value = 'loading'
  const ctx = await contextService.getContext(year.value)
  if (!ctx || ctx.limited) {
    status.value = 'limited'
    context.value = ctx
    return
  }
  context.value = ctx
  status.value = 'ready'
  const all = await phoneService.getPhones()
  phones.value = all.filter((p) => ctx.phones.some((v) => v.id === p.id))
  document.title = `${year.value} · 时代环境 — 手机历史博物馆`
}

onMounted(load)
watch(
  () => route.params.year,
  () => void load(),
)
</script>

<template>
  <div class="ctx container">
    <header class="ctx__head">
      <p class="label">CONTEXT · 历史环境</p>
      <p class="ctx__year year-mid">{{ year }}</p>
      <h1 class="heading-2">THE WORLD AROUND THE PHONE</h1>
      <p class="ctx__sub body-md">这台手机出厂时，世界正在发生什么。</p>
    </header>

    <!-- 年份切换 -->
    <nav class="ctx__years" aria-label="切换年份">
      <button
        v-for="y in years"
        :key="y"
        class="ctx__year-chip mono"
        :class="{ 'ctx__year-chip--on': y === year }"
        @click="router.replace(`/explore/context/${y}`)"
      >
        {{ y }}
      </button>
    </nav>

    <div v-if="status === 'loading'" class="label" style="padding-block: 80px">正在调取档案……</div>

    <div v-else-if="status === 'limited'" class="ctx__limited glass-card">
      <p class="mono">ARCHIVE CONTEXT LIMITED</p>
      <p class="body-md">这个年份的档案环境还没有整理完成。宁缺毋滥。</p>
    </div>

    <template v-else-if="context">
      <!-- 同时代手机 -->
      <section v-if="context.phones.length" class="ctx__section">
        <p class="label ctx__label">PHONE LANDSCAPE · 同时代的手机</p>
        <ul class="ctx__phones">
          <li v-for="p in phones" :key="p.id">
            <router-link :to="`/museum/exhibit/${p.id}`" class="ctx__phone" data-cursor="看展">
              <span class="ctx__phone-year mono">{{ p.releaseYear }}</span>
              <span class="ctx__phone-art"><PhonePhoto :phone="p" thumb /></span>
              <span class="ctx__phone-name">{{ p.name }}</span>
              <span class="label ctx__phone-brand">{{ p.brandName }}</span>
            </router-link>
          </li>
        </ul>
      </section>

      <div class="ctx__grid">
        <!-- 品牌 -->
        <section v-if="context.brands.length" class="ctx__section">
          <p class="label ctx__label">BRANDS · 活跃品牌</p>
          <div class="ctx__chips">
            <span v-for="b in context.brands" :key="b" class="ctx__chip">{{ b }}</span>
          </div>
        </section>

        <!-- 网络 -->
        <section v-if="context.networks.length" class="ctx__section">
          <p class="label ctx__label">NETWORK · 网络</p>
          <div class="ctx__chips">
            <span v-for="n in context.networks" :key="n" class="ctx__chip">{{ n }}</span>
          </div>
        </section>

        <!-- 技术 -->
        <section v-if="context.technologies.length" class="ctx__section">
          <p class="label ctx__label">TECHNOLOGY · 已登场的技术</p>
          <div class="ctx__chips">
            <span v-for="t in context.technologies" :key="t.id" class="ctx__chip">{{ t.name }}</span>
          </div>
        </section>

        <!-- 事件 -->
        <section v-if="context.events.length" class="ctx__section">
          <p class="label ctx__label">EVENTS · 那一年的大事</p>
          <ul class="ctx__events">
            <li v-for="e in context.events" :key="e.id" class="ctx__event">
              <span class="mono ctx__event-year">{{ e.year }}</span>
              <span class="ctx__event-title">{{ e.title }}</span>
            </li>
          </ul>
        </section>
      </div>

      <!-- 策展短注 -->
      <section v-if="context.culturalNotes?.length || context.designTrends?.length" class="ctx__notes">
        <div v-if="context.culturalNotes?.length" class="ctx__note glass-card">
          <p class="label ctx__label">CULTURE · 时代氛围</p>
          <p v-for="(n, i) in context.culturalNotes" :key="i" class="body-md ctx__note-text">{{ n }}</p>
        </div>
        <div v-if="context.designTrends?.length" class="ctx__note glass-card">
          <p class="label ctx__label">DESIGN · 设计趋势</p>
          <p v-for="(n, i) in context.designTrends" :key="i" class="body-md ctx__note-text">{{ n }}</p>
        </div>
      </section>

      <!-- 相关路线（context → journey 联动） -->
      <section v-if="context.journeys.length" class="ctx__section">
        <p class="label ctx__label">RELATED JOURNEYS · 相关路线</p>
        <div class="ctx__journeys">
          <router-link v-for="j in context.journeys" :key="j.id" :to="`/explore/journeys/${j.id}`" class="ctx__journey">
            <span class="ctx__journey-zh">{{ j.titleZh }}</span>
            <span class="label mono ctx__journey-en">{{ j.title }} →</span>
          </router-link>
        </div>
      </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.ctx {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head {
    .label {
      margin-bottom: $sp-2;
    }
  }

  &__year {
    font-size: clamp(56px, 12vw, 120px);
    color: $c-accent;
    line-height: 1;
  }

  &__sub {
    margin-top: $sp-3;
    color: $c-text-2;
  }

  &__years {
    margin-top: $sp-5;
    display: flex;
    gap: $sp-2;
    flex-wrap: wrap;
  }

  &__year-chip {
    font-size: 10px;
    padding: 7px 14px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-3;

    &:hover {
      color: $c-text;
    }

    &--on {
      color: $c-accent;
      border-color: rgba(184, 178, 164, 0.5);
    }
  }

  &__limited {
    margin-top: $sp-6;
    padding: $sp-7 $sp-6;
    display: flex;
    flex-direction: column;
    gap: $sp-2;
    align-items: flex-start;

    .mono {
      font-size: 11px;
      letter-spacing: 0.2em;
      color: $c-text-3;
    }
  }

  &__section {
    margin-top: $sp-7;
  }

  &__label {
    font-size: 10px;
    color: $c-text-3;
    margin-bottom: $sp-3;
  }

  &__phones {
    display: flex;
    flex-direction: column;
  }

  &__phone {
    display: flex;
    align-items: center;
    gap: $sp-4;
    padding: $sp-3 $sp-2;
    border-top: 1px solid $c-line-soft;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }
  }

  &__phone-year {
    width: 44px;
    font-size: 12px;
    color: $c-text-3;
    flex-shrink: 0;
  }

  &__phone-art {
    width: 34px;
    height: 44px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  &__phone-name {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__phone-brand {
    margin-left: auto;
    font-size: 9px;
    color: $c-text-3;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-5;

    @include desktop {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__chips {
    display: flex;
    gap: $sp-2;
    flex-wrap: wrap;
  }

  &__chip {
    font-size: 12px;
    padding: 7px 14px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-2;
  }

  &__events {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
  }

  &__event {
    display: flex;
    gap: $sp-3;
    align-items: baseline;
  }

  &__event-year {
    font-size: 11px;
    color: $c-accent;
  }

  &__event-title {
    font-size: 14px;
    color: $c-text-2;
    word-break: keep-all;
  }

  &__notes {
    margin-top: $sp-7;
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-4;

    @include desktop {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__note {
    padding: $sp-5;
  }

  &__note-text {
    color: $c-text-2;
    line-height: 1.8;

    & + & {
      margin-top: $sp-2;
    }
  }

  &__journeys {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
  }

  &__journey {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: $sp-4 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
    transition: border-color 0.3s var(--ease-museum);

    &:hover {
      border-color: $c-line;
    }
  }

  &__journey-zh {
    font-size: 16px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__journey-en {
    font-size: 9px;
    color: $c-text-3;
  }
}
</style>
