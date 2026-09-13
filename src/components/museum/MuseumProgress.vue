<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Reading progress hairline — the exhibition's wayfinding thread.

const progress = ref(0)

function onScroll() {
  const doc = document.documentElement
  const max = doc.scrollHeight - window.innerHeight
  progress.value = max > 0 ? Math.min(1, window.scrollY / max) : 0
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="progress" aria-hidden="true">
    <div class="progress__fill" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>
</template>

<style lang="scss" scoped>
.progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 50;
  pointer-events: none;

  &__fill {
    height: 100%;
    background: rgba(255, 255, 255, 0.55);
    transform-origin: left;
    transform: scaleX(0);
  }
}
</style>
