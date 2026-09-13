import { ref, onMounted, onUnmounted } from 'vue'

// prefers-reduced-motion support (spec §60).

const reduced = ref(false)
let mq: MediaQueryList | null = null
let onChange: ((e: MediaQueryListEvent) => void) | null = null

export function useReducedMotion() {
  onMounted(() => {
    if (typeof window === 'undefined') return
    if (!mq) {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      onChange = (e) => {
        reduced.value = e.matches
      }
      mq.addEventListener('change', onChange)
    }
    reduced.value = mq.matches
  })

  onUnmounted(() => {
    if (mq && onChange) {
      mq.removeEventListener('change', onChange)
      mq = null
      onChange = null
    }
  })

  return reduced
}
