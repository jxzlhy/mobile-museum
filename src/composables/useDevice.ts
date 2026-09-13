import { ref, computed, onMounted, onUnmounted } from 'vue'

// Capability detection over UA sniffing (spec §74).

const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isTouch = ref(false)

let bound = false
const listeners: Array<() => void> = []

function ensureGlobalBinding() {
  if (bound || typeof window === 'undefined') return
  bound = true
  const onResize = () => {
    width.value = window.innerWidth
  }
  window.addEventListener('resize', onResize, { passive: true })
  listeners.push(() => window.removeEventListener('resize', onResize))
}

export function useDevice() {
  ensureGlobalBinding()

  onMounted(() => {
    isTouch.value =
      window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
  })

  const isMobile = computed(() => width.value < 768)
  const isTablet = computed(() => width.value >= 768 && width.value < 1080)
  const isDesktop = computed(() => width.value >= 1080)

  return { isMobile, isTablet, isDesktop, isTouch, width }
}

export function destroyDeviceBindings() {
  listeners.forEach((off) => off())
  listeners.length = 0
  bound = false
}
