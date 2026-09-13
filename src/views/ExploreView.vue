<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storyService } from '@/services/storyService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'

// EXPLORE 探索枢纽（V0.3 §43–§45）：主导航保持稳定，
// 探索类入口统一聚合在这里，按探索体验排序。

useStageScene(() => new AmbientScene())

const storyCount = ref(0)

onMounted(async () => {
  const s = await storyService.getStories()
  storyCount.value = s.length
})

const sections = [
  { to: '/explore/evolution', index: '01', name: 'EVOLUTION', zh: '演化长卷', note: '拖动五十年，看电话长成今天的样子' },
  { to: '/explore/stories', index: '02', name: 'MUSEUM STORIES', zh: '专题展览', note: () => `${7} 个专题——手机如何改变世界的七个篇章`, count: storyCount },
  { to: '/phones', index: '03', name: 'ALL PHONES', zh: '全部藏品', note: '五十台真实设备的藏品总目' },
  { to: '/form-factor', index: '04', name: 'FORM FACTOR', zh: '形态馆', note: '砖块、翻盖、滑盖，直到折叠屏' },
  { to: '/compare', index: '05', name: 'COMPARE', zh: '对比实验室', note: '任意两台设备之间，隔着多少年变化' },
]
</script>

<template>
  <div class="page explore container">
    <header class="explore__head">
      <p class="label">EXPLORE · 探索</p>
      <h1 class="heading-1" style="margin-top: 16px">探索</h1>
      <p class="body-lg explore__intro">博物馆不止一种逛法。</p>
    </header>

    <nav class="explore__list">
      <router-link
        v-for="s in sections"
        :key="s.to"
        :to="s.to"
        class="explore__row"
        data-cursor="探索"
      >
        <span class="explore__index mono">{{ s.index }}</span>
        <span class="explore__name heading-2">{{ s.name }}</span>
        <span class="explore__zh">{{ s.zh }}</span>
        <span class="explore__note body-md">{{ typeof s.note === 'function' ? s.note() : s.note }}</span>
        <span class="explore__arrow mono" aria-hidden="true">→</span>
      </router-link>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
.explore {
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
    margin-top: $sp-4;
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
      '. zh arrow'
      '. note arrow';
    align-items: baseline;
    column-gap: $sp-4;
    row-gap: $sp-1;
    padding-block: $sp-6;
    border-top: 1px solid $c-line-soft;
    transition: background 0.4s var(--ease-museum);

    &:last-of-type {
      border-bottom: 1px solid $c-line-soft;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.03);

      .explore__arrow {
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
  }

  &__zh {
    grid-area: zh;
    color: $c-text-2;
    font-size: 15px;
    word-break: keep-all;
  }

  &__note {
    grid-area: note;
    color: $c-text-3;
    font-size: 13px;
    word-break: keep-all;
  }

  &__arrow {
    grid-area: arrow;
    color: $c-text-3;
    font-size: 18px;
    transition: transform 0.4s var(--ease-museum), color 0.4s var(--ease-museum);
  }

  @include desktop {
    &__row {
      grid-template-columns: 80px 1fr auto auto;
      grid-template-areas: 'index name zh note arrow';
    }

    &__note {
      text-align: right;
    }
  }
}
</style>
