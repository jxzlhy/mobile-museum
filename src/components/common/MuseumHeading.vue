<script setup lang="ts">
withDefaults(
  defineProps<{
    level?: 1 | 2 | 3
    variant?: 'heading-1' | 'heading-2' | 'display-1'
  }>(),
  { level: 2, variant: 'heading-1' },
)
</script>

<template>
  <component :is="`h${level}`" :class="variant">
    <slot />
  </component>
</template>
