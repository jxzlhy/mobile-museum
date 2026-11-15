<script setup lang="ts">
import ExhibitSource from '@/components/exhibit/ExhibitSource.vue'
import type { Phone } from '@/data/types'

// 展签正文（V0.5 §8）：快速事实 + 故事 + 意义 + 来源。
defineProps<{ phone: Phone }>()
</script>

<template>
  <section class="exhibit-story container">
    <dl v-if="phone.specs" class="exhibit-story__facts">
      <div v-if="phone.specs.weight" class="exhibit-story__fact">
        <dt class="label">重量</dt>
        <dd class="mono">{{ phone.specs.weight }} g</dd>
      </div>
      <div v-if="phone.specs.displaySize" class="exhibit-story__fact">
        <dt class="label">屏幕</dt>
        <dd class="mono">{{ phone.specs.displaySize }}"</dd>
      </div>
      <div v-if="phone.specs.network?.length" class="exhibit-story__fact">
        <dt class="label">网络</dt>
        <dd class="mono">{{ phone.specs.network.join(' · ') }}</dd>
      </div>
    </dl>

    <p v-if="phone.story" class="body-md exhibit-story__text">{{ phone.story }}</p>
    <p v-if="phone.significance" class="exhibit-story__quote">{{ phone.significance }}</p>

    <ExhibitSource :phone="phone" class="exhibit-story__source" />
  </section>
</template>

<style lang="scss" scoped>
.exhibit-story {
  padding-block: $sp-5;

  &__facts {
    display: flex;
    gap: $sp-6;
    flex-wrap: wrap;
    padding: $sp-4 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
  }

  &__fact {
    dd {
      margin-top: 2px;
      font-size: 14px;
      word-break: keep-all;
    }
  }

  &__text {
    margin-top: $sp-5;
    max-width: 68ch;
    color: $c-text-2;
    line-height: 1.85;
  }

  &__quote {
    margin-top: $sp-5;
    font-size: clamp(20px, 3vw, 32px);
    font-weight: 250;
    line-height: 1.4;
    border-left: 2px solid $c-accent;
    padding-left: $sp-4;
    max-width: 30ch;
    word-break: keep-all;
  }

  &__source {
    margin-top: $sp-6;
  }
}
</style>
