import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { sessionService } from './services/sessionService'
import './styles/main.scss'

const app = createApp(App)
app.use(router)
app.mount('#app')

// Dev-only debug hook for scroll choreography inspection.
if (import.meta.env.DEV) {
  import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
    ;(window as unknown as Record<string, unknown>).__ST = ScrollTrigger
  })
}

// ---- Resume（V0.9 §38 / §76）：记录最近一次参观位置 ----
sessionService.installRecorder(router)

// ---- Global Error Boundary（V0.9 §47 / V1.0 §38）：生产不显示堆栈 ----
app.config.errorHandler = (err, _instance, info) => {
  console.error('[MuseumError]', err, info)
  window.dispatchEvent(new CustomEvent('museum:error', { detail: { message: String(err) } }))
}
window.addEventListener('unhandledrejection', (e) => {
  console.error('[MuseumUnhandled]', e.reason)
})

// ---- Chunk Load Error Recovery（V0.9 §49 / V1.0 §39）----
window.addEventListener('error', (e) => {
  const target = e.target as HTMLElement | null
  const msg = String((e as ErrorEvent).message ?? '')
  if (
    (target && target.tagName === 'SCRIPT') ||
    /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)
  ) {
    sessionStorage.setItem('museum.chunkError', '1')
    window.dispatchEvent(new CustomEvent('museum:chunk-error'))
  }
}, true)

// ---- PWA（V0.9 §22–§26 / §62）：仅生产注册，只有一个 active SW ----
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js')
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing
          if (!nw) return
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('museum:update-available'))
            }
          })
        })
      })
      .catch(() => {})
  })
}
