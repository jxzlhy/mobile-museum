<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { phoneService } from '@/services/phoneService'
import { formFactorLabel } from '@/data/formFactors'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import { useCollection } from '@/composables/useCollection'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import type { FormFactor, Phone } from '@/data/types'

// ALL PHONES（规范 §17–§20）：藏品总目。
// Archive / Editorial List —— 不是卡片墙，是一座档案馆的检索柜。

useStageScene(() => new AmbientScene())

const { hasPhone } = useCollection()

const phones = ref<Phone[]>([])
const loading = ref(true)

const era = ref<string>('all')
const brand = ref<string>('all')
const form = ref<string>('all')
const level = ref<string>('all')

const ERAS = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s']
const LEVELS = [
  { id: '3', label: '珍品' },
  { id: '2', label: '重点' },
  { id: '1', label: '档案' },
]

onMounted(async () => {
  phones.value = await phoneService.getPhones()
  loading.value = false
})

const brands = computed(() => {
  const map = new Map<string, string>()
  phones.value.forEach((p) => map.set(p.brandId, p.brandName))
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'zh'))
})

const forms = computed(() => {
  const set = new Set<FormFactor>()
  phones.value.forEach((p) => p.formFactor && set.add(p.formFactor))
  return [...set]
})

const filtered = computed(() =>
  phones.value.filter((p) => {
    if (era.value !== 'all' && p.eraId !== era.value) return false
    if (brand.value !== 'all' && p.brandId !== brand.value) return false
    if (form.value !== 'all' && p.formFactor !== form.value) return false
    if (level.value !== 'all' && String(p.exhibitLevel) !== level.value) return false
    return true
  }),
)

const decades = computed(() => {
  const map = new Map<string, Phone[]>()
  filtered.value.forEach((p) => {
    const key = p.eraId ?? eraOfFallback(p.releaseYear)
    const arr = map.get(key) ?? []
    arr.push(p)
    map.set(key, arr)
  })
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})

function eraOfFallback(year: number) {
  return `${Math.floor(year / 10) * 10}s`
}

const filtersActive = computed(
  () => era.value !== 'all' || brand.value !== 'all' || form.value !== 'all' || level.value !== 'all',
)

function resetFilters() {
  era.value = 'all'
  brand.value = 'all'
  form.value = 'all'
  level.value = 'all'
}

const levelLabel = (p: Phone) => (p.exhibitLevel === 3 ? '珍品' : p.exhibitLevel === 2 ? '重点' : '档案')
</script>

<template>
  <div class="page allphones container">
    <header class="allphones__head">
      <p class="label">ARCHIVE · 藏品总目</p>
      <h1 class="allphones__title heading-1">全部藏品</h1>
      <p class="allphones__sub mono">1973 — 2026 · {{ filtered.length }} 件展品</p>
    </header>

    <!-- 筛选（规范 §19–§20：玻璃面板，低对比，非仪表盘） -->
    <GlassCard class="allphones__filters">
      <div class="allphones__filter-row">
        <span class="label allphones__filter-key">年代</span>
        <div class="allphones__chips">
          <button class="allphones__chip mono" :class="{ 'allphones__chip--on': era === 'all' }" @click="era = 'all'">全部</button>
          <button
            v-for="e in ERAS"
            :key="e"
            class="allphones__chip mono"
            :class="{ 'allphones__chip--on': era === e }"
            @click="era = era === e ? 'all' : e"
          >
            {{ e }}
          </button>
        </div>
      </div>
      <div class="allphones__filter-row">
        <span class="label allphones__filter-key">品牌</span>
        <div class="allphones__chips">
          <button class="allphones__chip mono" :class="{ 'allphones__chip--on': brand === 'all' }" @click="brand = 'all'">全部</button>
          <button
            v-for="[id, name] in brands"
            :key="id"
            class="allphones__chip"
            :class="{ 'allphones__chip--on': brand === id }"
            @click="brand = brand === id ? 'all' : id"
          >
            {{ name }}
          </button>
        </div>
      </div>
      <div class="allphones__filter-row">
        <span class="label allphones__filter-key">形态</span>
        <div class="allphones__chips">
          <button class="allphones__chip" :class="{ 'allphones__chip--on': form === 'all' }" @click="form = 'all'">全部</button>
          <button
            v-for="f in forms"
            :key="f"
            class="allphones__chip"
            :class="{ 'allphones__chip--on': form === f }"
            @click="form = form === f ? 'all' : f"
          >
            {{ formFactorLabel(f) }}
          </button>
        </div>
      </div>
      <div class="allphones__filter-row">
        <span class="label allphones__filter-key">级别</span>
        <div class="allphones__chips">
          <button class="allphones__chip" :class="{ 'allphones__chip--on': level === 'all' }" @click="level = 'all'">全部</button>
          <button
            v-for="l in LEVELS"
            :key="l.id"
            class="allphones__chip"
            :class="{ 'allphones__chip--on': level === l.id }"
            @click="level = level === l.id ? 'all' : l.id"
          >
            {{ l.label }}
          </button>
          <button v-if="filtersActive" class="allphones__chip allphones__chip--reset" @click="resetFilters">
            ✕ 重置
          </button>
        </div>
      </div>
    </GlassCard>

    <p v-if="loading" class="label" style="padding-block: 96px">开柜检索中……</p>

    <!-- 空状态（规范 §95） -->
    <p v-else-if="filtered.length === 0" class="allphones__empty body-lg">
      没有符合筛选条件的展品。<button class="allphones__retry" @click="resetFilters">重置筛选</button>
    </p>

    <!-- 档案列表：按年代分柜（规范 §18） -->
    <section v-for="[decade, list] in decades" :key="decade" class="allphones__decade">
      <h2 class="allphones__decade-label mono">{{ decade }}</h2>
      <nav class="allphones__list">
        <router-link
          v-for="p in list"
          :key="p.id"
          :to="`/phone/${p.id}`"
          class="allphones__row"
          data-cursor="看展"
        >
          <span class="allphones__photo">
            <PhonePhoto :phone="p" thumb />
          </span>
          <span class="allphones__body">
            <span class="allphones__year mono">{{ p.releaseYear }}</span>
            <span class="allphones__name">{{ p.name }}</span>
            <span class="allphones__meta label">
              {{ p.brandName }} · {{ formFactorLabel(p.formFactor) }}
              <span v-if="p.exhibitLevel === 3" class="allphones__level allphones__level--treasure">珍品</span>
              <span v-else-if="p.exhibitLevel === 2" class="allphones__level">重点</span>
              <span v-if="hasPhone(p.id)" class="allphones__level">✓ 已收藏</span>
            </span>
          </span>
          <span class="allphones__arrow mono" aria-hidden="true">→</span>
        </router-link>
      </nav>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.allphones {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head {
    .label {
      margin-bottom: $sp-2;
    }
  }

  &__sub {
    margin-top: $sp-4;
    color: $c-text-3;
    font-size: 12px;
    letter-spacing: 0.25em;
  }

  &__filters {
    margin-top: $sp-6;
    padding: $sp-5;
    display: flex;
    flex-direction: column;
    gap: $sp-3;
  }

  &__filter-row {
    display: grid;
    grid-template-columns: 48px 1fr;
    gap: $sp-3;
    align-items: start;
  }

  &__filter-key {
    padding-top: 7px;
    font-size: 9px;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: $sp-2;
  }

  &__chip {
    @include label-style(10px);
    letter-spacing: 0.12em;
    color: $c-text-3;
    padding: 6px 13px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    word-break: keep-all;
    transition: color 0.3s var(--ease-museum), border-color 0.3s var(--ease-museum),
      background 0.3s var(--ease-museum);

    &:hover {
      color: $c-text;
      border-color: $c-line;
    }

    &--on {
      color: #0a0a0a;
      background: rgba(255, 255, 255, 0.9);
      border-color: transparent;
    }

    &--reset {
      color: $c-text-2;
      border-style: dashed;
    }
  }

  &__empty {
    padding-block: $sp-9;
    color: $c-text-2;
  }

  &__retry {
    margin-left: $sp-3;
    color: $c-text;
    border-bottom: 1px solid $c-line;
  }

  &__decade {
    margin-top: $sp-8;
  }

  &__decade-label {
    color: $c-accent;
    font-size: 14px;
    letter-spacing: 0.3em;
    margin-bottom: $sp-2;
  }

  &__list {
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: 88px 1fr auto;
    align-items: center;
    gap: $sp-4;
    padding-block: $sp-3;
    border-top: 1px solid $c-line-soft;
    transition: background 0.35s var(--ease-museum);

    &:last-child {
      border-bottom: 1px solid $c-line-soft;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.03);

      .allphones__arrow {
        transform: translateX(6px);
        color: $c-text;
      }

      .allphones__photo :deep(img),
      .allphones__photo :deep(.phone-photo__silhouette) {
        transform: scale(1.04);
      }
    }
  }

  &__photo {
    height: 84px;
    width: 88px;

    :deep(img),
    :deep(.phone-photo__silhouette) {
      transition: transform 0.45s var(--ease-museum);
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__year {
    color: $c-text-3;
    font-size: 12px;
  }

  &__name {
    font-size: 18px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__meta {
    font-size: 9px;
    display: flex;
    flex-wrap: wrap;
    gap: $sp-2;
    align-items: baseline;
    word-break: keep-all;
  }

  &__level {
    color: $c-accent;
    border: 1px solid rgba(184, 178, 164, 0.4);
    border-radius: 999px;
    padding: 1px 8px;
    font-size: 9px;

    &--treasure {
      color: #0a0a0a;
      background: $c-accent;
      border-color: transparent;
    }
  }

  &__arrow {
    color: $c-text-3;
    transition: transform 0.35s var(--ease-museum), color 0.35s var(--ease-museum);
  }

  @include desktop {
    &__row {
      grid-template-columns: 120px 1fr auto;
    }

    &__photo {
      height: 112px;
      width: 120px;
    }
  }
}
</style>
