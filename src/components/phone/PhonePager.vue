<script setup lang="ts">
import type { Phone } from '@/data/types'

// 上一台 / 下一台（规范 §80）：相邻展品导航。
defineProps<{ prev?: Phone; next?: Phone }>()
</script>

<template>
  <nav class="pager" aria-label="相邻展品">
    <router-link
      v-if="prev"
      :to="`/phone/${prev.id}`"
      class="pager__item pager__item--prev"
      data-cursor="看展"
    >
      <span class="label">← 上一台</span>
      <span class="pager__name">{{ prev.name }}</span>
    </router-link>
    <span v-else class="pager__item pager__item--ghost"></span>
    <router-link
      v-if="next"
      :to="`/phone/${next.id}`"
      class="pager__item pager__item--next"
      data-cursor="看展"
    >
      <span class="label">下一台 →</span>
      <span class="pager__name">{{ next.name }}</span>
    </router-link>
  </nav>
</template>

<style lang="scss" scoped>
.pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-3;

  &__item {
    display: flex;
    flex-direction: column;
    gap: $sp-1;
    padding: $sp-4 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
    transition: border-color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

    .label {
      font-size: 9px;
      color: $c-text-3;
    }

    &:hover {
      border-color: $c-line;
      background: rgba(255, 255, 255, 0.03);
    }

    &--next {
      text-align: right;
      align-items: flex-end;
    }

    &--ghost {
      border: none;
    }
  }

  &__name {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }
}
</style>
