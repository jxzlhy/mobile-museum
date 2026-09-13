<script setup lang="ts">
// Glass is an auxiliary material (spec §46) — used for floating plates
// like the spec panel and search input, never as the whole page.
</script>

<template>
  <div class="glass-panel">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.glass-panel {
  @include glass(14px);
  padding: $sp-5;
}
</style>
