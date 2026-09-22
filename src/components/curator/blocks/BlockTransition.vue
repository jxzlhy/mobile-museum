<script setup lang="ts">
import { computed } from 'vue'
import type { ExhibitionBlock, TransitionBlockData } from '@/services/curator/types'

// Transition Block：展览章节分隔（细线 + 可选小字）。
const props = defineProps<{ block: ExhibitionBlock }>()
const data = computed(() => props.block.data as TransitionBlockData)
</script>

<template>
  <div class="btn-trans" role="separator">
    <span class="btn-trans__line" aria-hidden="true"></span>
    <p v-if="data.label" class="label btn-trans__label">{{ data.label }}</p>
    <span v-else class="btn-trans__dot" aria-hidden="true">·</span>
    <span class="btn-trans__line" aria-hidden="true"></span>
  </div>
</template>

<style lang="scss" scoped>
.btn-trans {
  display: flex;
  align-items: center;
  gap: $sp-4;
  padding-block: $sp-5;

  &__line {
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.12);
  }

  &__label {
    font-size: 9px;
    color: $c-accent;
    letter-spacing: 0.3em;
    word-break: keep-all;
  }

  &__dot {
    color: $c-accent;
    font-size: 18px;
  }
}
</style>
