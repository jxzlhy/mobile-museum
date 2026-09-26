<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// PWA 更新 + Chunk 恢复（V0.9 §49 / §63；V1.0 §39）：
// 新版本就绪或 chunk 加载失败时提示，由用户主动 UPDATE / RELOAD，
// 不自动刷新正在浏览的内容。

const visible = ref(false)
let waitingWorker: ServiceWorker | null = null

function show() {
  visible.value = true
}

function update() {
  if (waitingWorker) {
    waitingWorker.postMessage('SKIP_WAITING')
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  } else {
    sessionStorage.removeItem('museum.chunkError')
    window.location.reload()
  }
}

onMounted(() => {
  window.addEventListener('museum:update-available', show)
  window.addEventListener('museum:chunk-error', show)
  if (sessionStorage.getItem('museum.chunkError') === '1') {
    // 上一次会话末尾出现过 chunk 错误 —— 本次加载成功则清除
    sessionStorage.removeItem('museum.chunkError')
  }
  navigator.serviceWorker?.getRegistration?.().then((reg) => {
    const nw = reg?.waiting
    if (nw && navigator.serviceWorker.controller) {
      waitingWorker = nw
      show()
    }
  })
})
onUnmounted(() => {
  window.removeEventListener('museum:update-available', show)
  window.removeEventListener('museum:chunk-error', show)
})
</script>

<template>
  <transition name="upd">
    <div v-if="visible" class="upd" role="status">
      <p class="label upd__text">A NEW MUSEUM VERSION IS AVAILABLE</p>
      <button class="upd__btn label" @click="update">UPDATE</button>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.upd {
  position: fixed;
  left: 50%;
  bottom: calc(20px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 95;
  display: flex;
  align-items: center;
  gap: $sp-4;
  padding: $sp-3 $sp-5;
  border-radius: 999px;
  background: rgba(12, 12, 12, 0.9);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(184, 178, 164, 0.45);

  &__text {
    font-size: 9px;
    letter-spacing: 0.2em;
    color: $c-text-2;
    word-break: keep-all;
  }

  &__btn {
    padding: 7px 16px;
    border: 1px solid rgba(184, 178, 164, 0.55);
    border-radius: 999px;
    color: $c-accent;
    font-size: 9px;
    letter-spacing: 0.18em;

    &:hover {
      background: rgba(184, 178, 164, 0.12);
    }
  }
}

.upd-enter-active,
.upd-leave-active {
  transition: opacity 0.3s var(--ease-museum), transform 0.3s var(--ease-museum);
}

.upd-enter-from,
.upd-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
