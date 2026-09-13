<script setup lang="ts">
defineProps<{ text: string; index?: string }>()
</script>

<template>
  <p class="museum-label">
    <span v-if="index" class="museum-label__index mono">{{ index }}</span>
    <span class="museum-label__text">{{ text }}</span>
  </p>
</template>

<style lang="scss" scoped>
.museum-label {
  @include label-style;
  color: $c-text-3;
  display: flex;
  align-items: baseline;
  gap: $sp-3;

  &__index {
    color: $c-text-3;
  }

  &__text {
    color: $c-text-2;
  }
}
</style>
