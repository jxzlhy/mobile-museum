import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
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
