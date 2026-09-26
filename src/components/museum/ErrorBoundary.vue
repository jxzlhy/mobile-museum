<script setup lang="ts">
// Global Error Boundary（V0.9 §47 / V1.0 §38）：
// 未知错误显示 SOMETHING WENT WRONG / RETURN TO MUSEUM，
// 生产环境不显示堆栈；开发环境保留 console 详细日志（main.ts）。
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const visible = ref(false)
const isDev = import.meta.env.DEV
const detail = ref('')

function show(e: Event) {
  visible.value = true
  detail.value = (e as CustomEvent).detail?.message ?? ''
}

function recover() {
  visible.value = false
  router.push('/')
}

onMounted(() => window.addEventListener('museum:error', show))
onUnmounted(() => window.removeEventListener('museum:error', show))
</script>

<template>
  <div v-if="visible" class="eb" role="alert">
    <div class="eb__card glass-card">
      <p class="label mono eb__mark">MUSEUM ERROR</p>
      <h2 class="heading-2">出了点问题。</h2>
      <p class="body-md eb__desc">这次参观遇到了未知错误。回博物馆入口重新开始。</p>
      <p v-if="isDev && detail" class="mono eb__detail">{{ detail }}</p>
      <button class="eb__btn label" @click="recover">RETURN TO MUSEUM →</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.eb {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 4, 4, 0.86);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);

  &__card {
    width: min(420px, 88vw);
    padding: $sp-7 $sp-6;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-3;
    background: rgba(12, 12, 12, 0.92);
  }

  &__mark {
    font-size: 9px;
    letter-spacing: 0.3em;
    color: $c-accent;
  }

  &__desc {
    color: $c-text-2;
  }

  &__detail {
    font-size: 10px;
    color: $c-text-3;
    word-break: break-all;
    max-height: 120px;
    overflow-y: auto;
    width: 100%;
  }

  &__btn {
    margin-top: $sp-2;
    padding: $sp-3 $sp-5;
    border: 1px solid rgba(184, 178, 164, 0.55);
    border-radius: 999px;
    color: $c-accent;
    font-size: 10px;
    letter-spacing: 0.14em;

    &:hover {
      background: rgba(184, 178, 164, 0.1);
    }
  }
}
</style>
