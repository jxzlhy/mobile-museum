<script setup lang="ts">
import { computed } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { formFactorLabel } from '@/data/formFactors'
import type { Phone } from '@/data/types'

// 深度观展 · 展签头（V0.5 §6）：编号/年份/名称/品牌 + 收藏。
const props = defineProps<{ phone: Phone }>()

const { hasPhone, togglePhone } = useCollection()
const inCollection = computed(() => hasPhone(props.phone.id))
</script>

<template>
  <section class="exhibit-head container">
    <div class="exhibit-head__meta">
      <p v-if="phone.exhibitNo" class="mono exhibit-head__no">{{ phone.exhibitNo }}</p>
      <p class="exhibit-head__year mono">{{ phone.releaseYear }}</p>
      <h1 class="exhibit-head__name">{{ phone.name }}</h1>
      <p v-if="phone.tagline" class="exhibit-head__tagline body-lg">{{ phone.tagline }}</p>
      <p class="label exhibit-head__brand">
        {{ phone.brandName }}<template v-if="phone.formFactor"> · {{ formFactorLabel(phone.formFactor) }}</template>
      </p>
    </div>
    <div class="exhibit-head__actions">
      <button class="exhibit-head__collect" :class="{ 'exhibit-head__collect--on': inCollection }" @click="togglePhone(phone.id)">
        <span>{{ inCollection ? '✓' : '♡' }}</span>
        <span>{{ inCollection ? '已收藏' : '收藏' }}</span>
      </button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.exhibit-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: $sp-5;
  padding-block: $sp-6 $sp-4;
  flex-wrap: wrap;

  &__no {
    font-size: 10px;
    letter-spacing: 0.3em;
    color: $c-accent;
  }

  &__year {
    margin-top: $sp-2;
    font-size: 13px;
    letter-spacing: 0.25em;
    color: $c-text-2;
  }

  &__name {
    margin-top: $sp-1;
    font-size: clamp(30px, 5.4vw, 56px);
    font-weight: 250;
    line-height: 1.08;
    word-break: keep-all;
  }

  &__tagline {
    margin-top: $sp-3;
    color: $c-text-2;
  }

  &__brand {
    margin-top: $sp-2;
    font-size: 10px;
  }

  &__collect {
    display: inline-flex;
    align-items: center;
    gap: $sp-2;
    padding: $sp-3 $sp-5;
    border: 1px solid $c-line;
    border-radius: 999px;
    color: $c-text;
    @include label-style(12px);
    letter-spacing: 0.16em;
    transition: border-color 0.3s var(--ease-museum), color 0.3s var(--ease-museum);

    &--on {
      border-color: rgba(184, 178, 164, 0.55);
      color: $c-accent;
    }
  }
}
</style>
