<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDevice } from '@/composables/useDevice'

// INSTALL MUSEUM（V0.9 §27–§30）：
// 轻量安装入口 —— Android Chrome 用 beforeinstallprompt，
// iOS Safari 提供「分享 → 添加到主屏幕」指引。
// 第二次访问才出现；用户关闭后尊重选择（§28）。

const DISMISS_KEY = 'museum.preferences.installDismissed'
const VISITS_KEY = 'museum.preferences.visits'

const { isTouch } = useDevice()
const visible = ref(false)
const isIOS = ref(false)
let deferredPrompt: (Event & { prompt: () => Promise<void> }) | null = null

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* ignore */
  }
  visible.value = false
}

function install() {
  if (deferredPrompt) {
    void deferredPrompt.prompt()
    visible.value = false
  }
}

function onBIP(e: Event) {
  e.preventDefault()
  deferredPrompt = e as Event & { prompt: () => Promise<void> }
  maybeShow()
}

function maybeShow() {
  if (dismissed()) return
  if (!deferredPrompt && !isIOS.value) return
  visible.value = true
}

onMounted(() => {
  // 访问计数（第二次访问起展示，§28）
  let visits = 0
  try {
    visits = Number(localStorage.getItem(VISITS_KEY) ?? '0')
    localStorage.setItem(VISITS_KEY, String(visits + 1))
  } catch {
    visits = 1
  }
  isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
  window.addEventListener('beforeinstallprompt', onBIP)
  if (visits >= 2) {
    if (isIOS.value) visible.value = !dismissed()
    // Android/Desktop 由 beforeinstallprompt 触发
  }
})
onUnmounted(() => window.removeEventListener('beforeinstallprompt', onBIP))
</script>

<template>
  <transition name="inst">
    <div v-if="visible" class="inst" role="dialog" aria-label="安装博物馆">
      <div class="inst__body">
        <p class="label inst__head">INSTALL MUSEUM · 添加到主屏幕</p>
        <p v-if="isIOS" class="label inst__step">Safari 分享 → 「添加到主屏幕」</p>
        <p v-else class="label inst__step">安装后可离线继续参观</p>
      </div>
      <div class="inst__actions">
        <button v-if="!isIOS" class="inst__btn inst__btn--accent" @click="install">INSTALL</button>
        <button class="inst__btn" aria-label="关闭安装提示" @click="dismiss">✕</button>
      </div>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.inst {
  position: fixed;
  left: $sp-4;
  right: $sp-4;
  bottom: calc(20px + env(safe-area-inset-bottom));
  z-index: 94;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-3;
  padding: $sp-3 $sp-4;
  border-radius: 16px;
  background: rgba(12, 12, 12, 0.9);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(184, 178, 164, 0.4);

  &__head {
    font-size: 9px;
    letter-spacing: 0.2em;
    color: $c-text;
  }

  &__step {
    margin-top: 2px;
    font-size: 9px;
    color: $c-text-3;
    word-break: keep-all;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $sp-2;
    flex-shrink: 0;
  }

  &__btn {
    padding: 8px 14px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-2;
    font-size: 9px;
    letter-spacing: 0.15em;

    &--accent {
      border-color: rgba(184, 178, 164, 0.55);
      color: $c-accent;
    }
  }
}

.inst-enter-active,
.inst-leave-active {
  transition: opacity 0.3s var(--ease-museum), transform 0.3s var(--ease-museum);
}

.inst-enter-from,
.inst-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
