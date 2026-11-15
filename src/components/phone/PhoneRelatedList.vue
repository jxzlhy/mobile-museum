<script setup lang="ts">
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import type { Phone } from '@/data/types'

// 相关展品列表（规范 §33）：推荐带理由、相关不带，同一版式复用。
interface Item {
  phone: Phone
  reason?: string
}

defineProps<{ items: Item[] }>()
</script>

<template>
  <nav class="related">
    <router-link
      v-for="r in items"
      :key="r.phone.id"
      :to="`/phone/${r.phone.id}`"
      class="related__row"
      data-cursor="看展"
    >
      <span class="related__year mono">{{ r.phone.releaseYear }}</span>
      <PhonePhoto :phone="r.phone" thumb class="related__photo" />
      <span class="related__body">
        <span class="related__name">{{ r.phone.name }}</span>
        <span class="related__brand label">{{ r.phone.brandName }}</span>
        <span v-if="r.reason" class="related__reason label mono">{{ r.reason }}</span>
      </span>
      <span class="related__arrow mono" aria-hidden="true">→</span>
    </router-link>
  </nav>
</template>

<style lang="scss" scoped>
.related {
  display: flex;
  flex-direction: column;

  &__row {
    display: flex;
    align-items: center;
    gap: $sp-4;
    padding-block: $sp-3;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    transition: background 0.35s var(--ease-museum);

    &:first-child {
      border-top: none;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.04);

      .related__arrow {
        transform: translateX(6px);
        color: $c-text;
      }
    }
  }

  &__year {
    color: $c-text-3;
    width: 52px;
    flex-shrink: 0;
  }

  &__photo {
    width: 44px;
    height: 56px;
    flex-shrink: 0;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 17px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__brand {
    font-size: 9px;
  }

  &__reason {
    margin-top: 2px;
    font-size: 9px;
    color: $c-accent;
    letter-spacing: 0.08em;
    word-break: keep-all;
  }

  &__arrow {
    margin-left: auto;
    color: $c-text-3;
    transition: transform 0.35s var(--ease-museum), color 0.35s var(--ease-museum);
  }
}
</style>
