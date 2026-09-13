<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Desktop cursor (spec §82): VIEW / DRAG / EXPLORE hints.
// Elements opt in with data-cursor="…". Never rendered on touch devices.

const x = ref(-100)
const y = ref(-100)
const label = ref<string | null>(null)
const visible = ref(false)

let enabled = false
let raf = 0
let targetX = -100
let targetY = -100

function onMove(e: PointerEvent) {
  targetX = e.clientX
  targetY = e.clientY
  visible.value = true
  const el = (e.target as HTMLElement | null)?.closest?.('[data-cursor]')
  label.value = el ? el.getAttribute('data-cursor') : null
}

function onLeave() {
  visible.value = false
}

function tick() {
  raf = requestAnimationFrame(tick)
  x.value += (targetX - x.value) * 0.18
  y.value += (targetY - y.value) * 0.18
}

onMounted(() => {
  const fine = window.matchMedia('(pointer: fine)').matches
  if (!fine) return
  enabled = true
  window.addEventListener('pointermove', onMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  raf = requestAnimationFrame(tick)
})

onUnmounted(() => {
  if (!enabled) return
  window.removeEventListener('pointermove', onMove)
  document.documentElement.removeEventListener('pointerleave', onLeave)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div v-if="enabled" class="cursor" :class="{ 'cursor--hidden': !visible }" aria-hidden="true">
    <div class="cursor__dot" :style="{ transform: `translate(${x}px, ${y}px)` }"></div>
    <div
      v-if="label"
      class="cursor__label"
      :style="{ transform: `translate(${x + 18}px, ${y + 18}px)` }"
    >
      {{ label }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.cursor {
  position: fixed;
  inset: 0;
  z-index: 90;
  pointer-events: none;

  &--hidden {
    opacity: 0;
  }

  &__dot {
    position: absolute;
    top: -3px;
    left: -3px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    mix-blend-mode: difference;
  }

  &__label {
    position: absolute;
    @include label-style(10px);
    color: $c-text;
    background: rgba(8, 8, 8, 0.8);
    border: 1px solid $c-line;
    padding: 4px 8px;
    white-space: nowrap;
  }
}
</style>
