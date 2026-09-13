<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    to?: string
    variant?: 'cta' | 'ghost' | 'line'
    size?: 'md' | 'lg'
    disabled?: boolean
  }>(),
  { variant: 'ghost', size: 'md', disabled: false, to: undefined },
)

const tag = computed(() => (props.to ? 'router-link' : 'button'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :disabled="disabled"
    class="museum-button"
    :class="[`museum-button--${variant}`, `museum-button--${size}`]"
  >
    <span class="museum-button__label"><slot /></span>
  </component>
</template>

<style lang="scss" scoped>
.museum-button {
  @include label-style;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $sp-3;
  color: $c-text;
  background: transparent;
  border: 1px solid $c-line;
  transition:
    background 0.4s var(--ease-museum),
    border-color 0.4s var(--ease-museum),
    color 0.4s var(--ease-museum),
    transform 0.4s var(--ease-museum);
  user-select: none;

  &--md {
    padding: $sp-3 $sp-5;
  }

  &--lg {
    padding: $sp-4 $sp-6;
  }

  &--cta {
    background: rgba(255, 255, 255, 0.92);
    color: #0a0a0a;
    border-color: transparent;

    &:hover,
    &:focus-visible {
      background: #ffffff;
      transform: translateY(-1px);
    }
  }

  &--ghost {
    &:hover,
    &:focus-visible {
      background: $c-glass;
      border-color: rgba(255, 255, 255, 0.35);
    }
  }

  &--line {
    border: none;
    border-top: 1px solid $c-line;
    border-bottom: 1px solid transparent;
    padding-inline: 0;

    &:hover,
    &:focus-visible {
      border-bottom-color: $c-line;
      color: $c-text;
    }
  }

  &:active {
    transform: translateY(0) scale(0.99);
  }
}
</style>
