<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { searchService } from '@/services/searchService'
import { phoneService } from '@/services/phoneService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
import type { Phone } from '@/data/types'

// 搜索（规范 §37–§42）：博物馆查询台。结果展示实拍图；
// 未输入时展示 POPULAR EXHIBITS，避免空白。

useStageScene(() => new AmbientScene())

const query = ref('')
const results = computed(() => searchService.search(query.value))
const popular = ref<Phone[]>([])

const suggestions = ['iPhone', '诺基亚', '翻盖', '2007', '5G', '折叠屏']
const decadeChips = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s']

onMounted(async () => {
  popular.value = (await phoneService.getFeaturedPhones()).slice(-6).reverse()
})
</script>

<template>
  <div class="page search container">
    <header class="search__head">
      <p class="label">查询台</p>
      <h1 class="heading-1" style="margin-top: 16px">搜索</h1>
      <p class="search__question body-lg">你在找什么？</p>

      <GlassPanel class="search__box">
        <input
          v-model="query"
          type="search"
          class="search__input"
          placeholder="手机、品牌、技术、年份……"
          aria-label="搜索博物馆"
          autofocus
        />
      </GlassPanel>

      <div v-if="results.total === 0" class="search__suggestions">
        <span class="label">试试</span>
        <button v-for="s in suggestions" :key="s" class="search__chip mono" @click="query = s">
          {{ s }}
        </button>
      </div>
    </header>

    <!-- 空态：POPULAR EXHIBITS + 按年代探索（规范 §40 / §73） -->
    <template v-if="query.trim() === ''">
      <section class="search__group">
        <p class="label">热门展品 · POPULAR EXHIBITS</p>
        <nav class="search__rows">
          <router-link
            v-for="(p, i) in popular"
            :key="p.id"
            :to="`/phone/${p.id}`"
            class="search__row"
            data-cursor="看展"
          >
            <span class="search__rank mono">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="search__thumb"><PhonePhoto :phone="p" thumb /></span>
            <span class="search__body">
              <span class="search__name">{{ p.name }}</span>
              <span class="label search__meta">{{ p.brandName }} · {{ p.releaseYear }}</span>
            </span>
            <span class="search__arrow mono" aria-hidden="true">→</span>
          </router-link>
        </nav>
      </section>

      <section class="search__group">
        <p class="label">按年代探索 · EXPLORE BY YEAR</p>
        <div class="search__suggestions">
          <router-link
            v-for="d in decadeChips"
            :key="d"
            :to="`/phones?era=${d}`"
            class="search__chip mono"
          >
            {{ d }}
          </router-link>
        </div>
      </section>
    </template>

    <!-- 无结果（规范 §95） -->
    <p v-else-if="results.total === 0" class="search__empty body-lg">
      馆藏中没有与「{{ query }}」匹配的展品。
    </p>

    <section v-if="results.phones.length" class="search__group">
      <p class="label">手机 · {{ results.phones.length }}</p>
      <nav class="search__rows">
        <router-link
          v-for="p in results.phones"
          :key="p.id"
          :to="`/phone/${p.id}`"
          class="search__row"
          data-cursor="看展"
        >
          <span class="search__year mono">{{ p.releaseYear }}</span>
          <span class="search__thumb"><PhonePhoto :phone="p" thumb /></span>
          <span class="search__body">
            <span class="search__name">{{ p.name }}</span>
            <span class="label search__meta">{{ p.brandName }} · {{ (p.tagline ?? '').slice(0, 42) }}</span>
          </span>
          <span class="search__arrow mono" aria-hidden="true">→</span>
        </router-link>
      </nav>
    </section>

    <section v-if="results.brands.length" class="search__group">
      <p class="label">品牌 · {{ results.brands.length }}</p>
      <nav class="search__rows">
        <router-link
          v-for="b in results.brands"
          :key="b.id"
          :to="`/brand/${b.id}`"
          class="search__row"
        >
          <span class="search__year mono">{{ b.foundedYear ?? '—' }}</span>
          <span class="search__body">
            <span class="search__name">{{ b.name }}</span>
            <span class="label search__meta">{{ (b.country ?? '') }}</span>
          </span>
          <span class="search__arrow mono" aria-hidden="true">→</span>
        </router-link>
      </nav>
    </section>

    <section v-if="results.technologies.length" class="search__group">
      <p class="label">技术 · {{ results.technologies.length }}</p>
      <nav class="search__rows">
        <router-link
          v-for="t in results.technologies"
          :key="t.id"
          to="/technology"
          class="search__row"
        >
          <span class="search__year mono">{{ t.startYear ?? '—' }}</span>
          <span class="search__body">
            <span class="search__name">{{ t.name }}</span>
            <span class="label search__meta">{{ t.category }}</span>
          </span>
          <span class="search__arrow mono" aria-hidden="true">→</span>
        </router-link>
      </nav>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.search {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head {
    .label {
      margin-bottom: $sp-2;
    }
  }

  &__question {
    margin-top: $sp-3;
  }

  &__box {
    margin-top: $sp-6;
    padding: $sp-2 $sp-4;
  }

  &__input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: $c-text;
    font-size: 20px;
    font-weight: 200;
    padding-block: $sp-3;

    &::placeholder {
      color: $c-text-3;
    }

    &::-webkit-search-cancel-button {
      filter: invert(1);
    }
  }

  &__suggestions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $sp-2;
    margin-top: $sp-5;

    .label {
      margin-right: $sp-2;
    }
  }

  &__chip {
    @include label-style(10px);
    color: $c-text-2;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    padding: 6px 14px;
    transition: border-color 0.3s var(--ease-museum), color 0.3s var(--ease-museum);

    &:hover {
      color: $c-text;
      border-color: $c-line;
    }
  }

  &__empty {
    margin-top: $sp-8;
    color: $c-text-2;
  }

  &__group {
    margin-top: $sp-8;

    > .label {
      margin-bottom: $sp-4;
    }
  }

  &__rows {
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: flex;
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

      .search__arrow {
        transform: translateX(6px);
        color: $c-text;
      }
    }
  }

  &__year {
    color: $c-text-3;
    width: 52px;
    flex-shrink: 0;
    font-size: 13px;
  }

  &__thumb {
    width: 44px;
    height: 56px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  &__rank {
    color: $c-accent;
    width: 30px;
    flex-shrink: 0;
    font-size: 12px;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__name {
    font-size: 16px;
    font-weight: 350;
  }

  &__meta {
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__arrow {
    margin-left: auto;
    color: $c-text-3;
    transition: transform 0.35s var(--ease-museum), color 0.35s var(--ease-museum);
  }
}
</style>
