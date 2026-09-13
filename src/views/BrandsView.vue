<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { brandService } from '@/services/brandService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import type { Brand } from '@/data/types'

// 品牌馆索引（规范 §35）：附每家品牌的馆藏数量。

useStageScene(() => new AmbientScene())

const brands = ref<Array<Brand & { count: number }>>([])
const loading = ref(true)

onMounted(async () => {
  const list = await brandService.getBrands()
  brands.value = await Promise.all(
    list.map(async (b) => ({ ...b, count: await brandService.countPhones(b) })),
  )
  loading.value = false
})
</script>

<template>
  <div class="page brands container">
    <header class="brands__head">
      <p class="label">造手机的人</p>
      <h1 class="heading-1" style="margin-top: 16px">品牌<br />馆</h1>
      <p class="body-lg brands__intro">
        十六家公司，决定了手机长什么样、怎么响、意味着什么。
      </p>
    </header>

    <p v-if="loading" class="label" style="padding-block: 64px">展厅开放中……</p>

    <nav v-else class="brands__list">
      <router-link
        v-for="(b, i) in brands"
        :key="b.id"
        :to="`/brand/${b.id}`"
        class="brands__row"
        data-cursor="探索"
      >
        <span class="brands__index mono">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="brands__name heading-2">{{ b.name }}<span class="brands__name-en mono">{{ b.nameEn }}</span></span>
        <span class="brands__meta label">{{ (b.country ?? '') }} · 创立于 {{ b.foundedYear ?? '—' }}<template v-if="b.count"> · 馆藏 {{ b.count }} 件</template></span>
        <span class="brands__arrow mono" aria-hidden="true">→</span>
      </router-link>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
.brands {
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
    margin-top: $sp-5;
    max-width: 44ch;
  }

  &__list {
    margin-top: $sp-8;
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    grid-template-areas:
      'index name arrow'
      '. meta .';
    align-items: baseline;
    column-gap: $sp-4;
    padding-block: $sp-5;
    border-top: 1px solid $c-line-soft;
    transition: background 0.35s var(--ease-museum);

    &:last-child {
      border-bottom: 1px solid $c-line-soft;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.03);

      .brands__arrow {
        transform: translateX(6px);
        color: $c-text;
      }
    }
  }

  &__index {
    grid-area: index;
    color: $c-text-3;
    font-size: 12px;
  }

  &__name {
    grid-area: name;

    &-en {
      margin-left: $sp-3;
      font-size: 11px;
      letter-spacing: 0.2em;
      color: $c-text-3;
      font-weight: 400;
    }
  }

  &__meta {
    grid-area: meta;
    font-size: 9px;
  }

  &__arrow {
    grid-area: arrow;
    color: $c-text-3;
    transition: transform 0.35s var(--ease-museum), color 0.35s var(--ease-museum);
  }

  @include desktop {
    &__row {
      grid-template-columns: 80px 1fr 1fr auto;
      grid-template-areas: 'index name meta arrow';
    }
  }
}
</style>
