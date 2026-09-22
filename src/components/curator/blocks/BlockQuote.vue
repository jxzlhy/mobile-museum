<script setup lang="ts">
import { computed } from 'vue'
import type { ExhibitionBlock, QuoteBlockData } from '@/services/curator/types'

// Quote Block（V0.8 §10）：属于用户个人表达，不伪装成历史引用。
const props = defineProps<{ block: ExhibitionBlock }>()
const data = computed(() => props.block.data as QuoteBlockData)
</script>

<template>
  <p v-if="!data.text?.trim()" class="mono bq-empty">QUOTE · 待填写</p>
  <figure v-else class="bq">
    <span class="bq-mark" aria-hidden="true">❝</span>
    <blockquote class="bq-text">{{ data.text }}</blockquote>
    <figcaption class="label bq-attr">A CURATOR'S WORD · 策展人语</figcaption>
  </figure>
</template>

<style lang="scss" scoped>
.bq {
  text-align: center;
  padding-block: $sp-3;

  &-mark {
    font-size: 28px;
    color: $c-accent;
  }

  &-text {
    margin: $sp-2 auto 0;
    max-width: 28ch;
    font-size: clamp(20px, 3.4vw, 32px);
    font-weight: 250;
    line-height: 1.5;
    word-break: keep-all;
  }

  &-attr {
    margin-top: $sp-3;
    font-size: 8px;
    color: $c-text-3;
    letter-spacing: 0.28em;
  }
}

.bq-empty {
  font-size: 10px;
  color: $c-text-3;
  letter-spacing: 0.15em;
  text-align: center;
}
</style>
