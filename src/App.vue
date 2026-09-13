<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Stage } from '@/three/core/Stage'
import { useMuseum } from '@/composables/useMuseum'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useDevice } from '@/composables/useDevice'
import { detectWebGL } from '@/composables/useWebGL'
import { createSmoothScroll, getSmoothScroll, destroySmoothScroll } from '@/composables/useSmoothScroll'
import MuseumNav from '@/components/museum/MuseumNav.vue'
import MuseumBackground from '@/components/museum/MuseumBackground.vue'
import MuseumProgress from '@/components/museum/MuseumProgress.vue'
import MuseumCursor from '@/components/museum/MuseumCursor.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'

// The museum shell: persistent stage canvas behind everything,
// preloader at the door, navigation and atmosphere around it.

gsap.registerPlugin(ScrollTrigger)

const museum = useMuseum()
const route = useRoute()
const canvasEl = ref<HTMLCanvasElement>()
const reduced = useReducedMotion()
const { isMobile } = useDevice()

let lenisStarted = false

// ---- Preloader progress: stage init → scene ready → fonts → min dwell ----
onMounted(async () => {
  history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)

  museum.setProgress(0.15)
  const webgl = detectWebGL()
  museum.setWebgl(webgl)

  if (webgl && canvasEl.value) {
    Stage.init(canvasEl.value)
    museum.setProgress(0.35)
  }

  const sceneReady = new Promise<void>((resolve) => {
    if (Stage.isReady) return resolve()
    if (!webgl) return resolve()
    const timer = setTimeout(resolve, 3500) // never trap the visitor at the door
    Stage.onSceneSet = (s) => {
      if (s) {
        clearTimeout(timer)
        resolve()
      }
    }
  })

  const fontsReady = (document.fonts?.ready as Promise<unknown> | undefined) ?? Promise.resolve()
  const dwell = new Promise((r) => setTimeout(r, 900))

  await Promise.all([sceneReady, fontsReady, dwell])
  museum.setProgress(1)
  museum.setReady(true)
})

// ---- ENTER MUSEUM: release scroll ----
watch(
  () => museum.state.entered,
  (entered) => {
    if (!entered) return
    if (!reduced.value) {
      const lenis = createSmoothScroll()
      lenis.on('scroll', ScrollTrigger.update)
      if (!lenisStarted) {
        gsap.ticker.add((time) => getSmoothScroll()?.raf(time * 1000))
        gsap.ticker.lagSmoothing(0)
        lenisStarted = true
      }
      lenis.start()
    }
    document.body.style.overflow = ''
    requestAnimationFrame(() => ScrollTrigger.refresh())
  },
)

// Lock scroll while the veil is up
watch(
  [() => museum.state.entered, reduced],
  ([entered, isReduced]) => {
    if (!entered && !isReduced) {
      // lenis not yet created — lock the body directly
      document.body.style.overflow = 'hidden'
    }
  },
  { immediate: true },
)

// ---- Reduced motion mode (spec §60) ----
watch(
  reduced,
  (v) => {
    museum.setMotionMode(v ? 'reduced' : 'standard')
    document.documentElement.dataset.motion = v ? 'reduced' : 'standard'
  },
  { immediate: true },
)

// ---- Route changes: back to top ----
watch(
  () => route.path,
  () => {
    if (!museum.state.entered) return
    const lenis = getSmoothScroll()
    if (lenis) lenis.scrollTo(0, { immediate: true })
    window.scrollTo(0, 0)
    requestAnimationFrame(() => ScrollTrigger.refresh())
  },
)

onUnmounted(() => {
  destroySmoothScroll()
  Stage.clearScene()
})
</script>

<template>
  <div class="app">
    <canvas
      ref="canvasEl"
      class="stage-canvas"
      :class="{ 'stage-canvas--static': !museum.state.webgl }"
      aria-hidden="true"
    ></canvas>

    <MuseumBackground />
    <MuseumProgress />
    <MuseumNav />
    <MuseumCursor />

    <main class="page-root">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <LoadingOverlay />
  </div>
</template>

<style lang="scss" scoped>
.app {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
}

.stage-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.8s var(--ease-museum);

  &--live {
    opacity: 1;
  }

  &--static {
    display: none;
  }
}

.page-root {
  position: relative;
  z-index: 1;
}

// ---- Page transition: not a plain fade — a shutter + blur + scale (spec §19) ----
.page-enter-active {
  transition: opacity 0.5s var(--ease-museum), filter 0.5s var(--ease-museum),
    transform 0.5s var(--ease-museum), clip-path 0.5s var(--ease-museum);
}

.page-leave-active {
  transition: opacity 0.32s var(--ease-museum), clip-path 0.32s var(--ease-museum);
}

.page-enter-from {
  opacity: 0;
  filter: blur(10px);
  transform: scale(0.99);
  clip-path: inset(6% 0 6% 0);
}

.page-leave-to {
  opacity: 0;
  clip-path: inset(0 0 100% 0);
}
</style>
