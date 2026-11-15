<script setup lang="ts">
import { useDevice } from '@/composables/useDevice'

// 模式切换（§4 / §29）：能力驱动，不存在的模式不出入口。
export interface ExhibitModeOption {
  id: string
  en: string
  zh: string
}

defineProps<{
  modes: ExhibitModeOption[]
  modelValue: string
  has3d: boolean
  autoRotate: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void
  (e: 'toggle-auto'): void
  (e: 'reset'): void
}>()

const { isDesktop } = useDevice()
</script>

<template>
  <nav class="exhibit-modes" :class="{ 'exhibit-modes--desktop': isDesktop }" aria-label="观察方式">
    <button
      v-for="m in modes"
      :key="m.id"
      class="exhibit-modes__btn"
      :class="{ 'exhibit-modes__btn--on': modelValue === m.id }"
      @click="emit('update:modelValue', m.id)"
    >
      {{ m.en }}
    </button>
    <span v-if="has3d && modelValue !== 'real'" class="exhibit-modes__extra">
      <button class="exhibit-modes__mini" :aria-pressed="autoRotate" @click="emit('toggle-auto')">
        {{ autoRotate ? 'AUTO ON' : 'AUTO OFF' }}
      </button>
      <button class="exhibit-modes__mini" @click="emit('reset')">RESET</button>
    </span>
  </nav>
</template>

<style lang="scss" scoped>
.exhibit-modes {
  position: sticky;
  top: calc(64px + env(safe-area-inset-top));
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  margin-inline: $sp-4;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.72);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  overflow-x: auto;

  @include desktop {
    margin-inline: auto;
    width: fit-content;
  }

  &__btn {
    @include label-style(10px);
    letter-spacing: 0.1em;
    padding: 9px 16px;
    border-radius: 999px;
    color: $c-text-3;
    white-space: nowrap;
    transition: color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

    &--on {
      color: #0a0a0a;
      background: rgba(255, 255, 255, 0.9);
    }
  }

  &__extra {
    display: inline-flex;
    gap: 4px;
    margin-left: $sp-2;
  }

  &__mini {
    @include label-style(9px);
    padding: 8px 12px;
    border-radius: 999px;
    color: $c-text-3;
    border: 1px solid rgba(255, 255, 255, 0.1);
    white-space: nowrap;

    &:hover {
      color: $c-text;
    }
  }
}
</style>
