<script setup lang="ts">
import { computed } from 'vue'
import type { ExhibitionBlock, TextBlockData } from '@/services/curator/types'

// Text Block = CURATOR NOTE（V0.8 §10–§11）：纯文本，个人表达。
const props = defineProps<{ block: ExhibitionBlock }>()
const data = computed(() => props.block.data as TextBlockData)
</script>

<template>
  <p v-if="!data.text?.trim()" class="mono bt-empty">CURATOR NOTE · 待填写</p>
  <aside v-else class="bt">
    <p class="label bt-kind">CURATOR NOTE</p>
    <p class="bt-text">{{ data.text }}</p>
  </aside>
</template>

<style lang="scss" scoped>
.bt {
  padding-left: $sp-4;
  border-left: 2px solid rgba(184, 178, 164, 0.5);

  &-kind {
    font-size: 8px;
    color: $c-accent;
    letter-spacing: 0.28em;
  }

  &-text {
    margin-top: $sp-2;
    font-size: 16px;
    font-style: italic;
    line-height: 1.8;
    color: $c-text-2;
    white-space: pre-wrap;
  }
}

.bt-empty {
  font-size: 10px;
  color: $c-text-3;
  letter-spacing: 0.15em;
}
</style>
