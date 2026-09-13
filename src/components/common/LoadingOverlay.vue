<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useMuseum } from '@/composables/useMuseum'
import MuseumButton from './MuseumButton.vue'

// 首次加载体验（规范 §76）：不出现白屏，呈现的是一扇博物馆的门。

const museum = useMuseum()

const percent = computed(() => Math.round(museum.state.progress * 100))

// 后台标签页里 transitionend 可能被冻结，导致透明门帘残留并拦截点击——
// 用定时器兜底强制卸载（规范 §60 精神：任何情况下不能挡住访客）。
const forceUnmounted = ref(false)
let unmountTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => museum.state.entered,
  (entered) => {
    if (entered && !unmountTimer) {
      unmountTimer = setTimeout(() => (forceUnmounted.value = true), 1100)
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (unmountTimer) clearTimeout(unmountTimer)
})

function enter() {
  museum.enter()
}
</script>

<template>
  <transition name="veil">
    <div v-if="!forceUnmounted" class="veil" role="dialog" aria-label="正在布展">
      <div class="veil__inner">
        <p class="veil__label mono">DIGITAL EXHIBITION — V0.2</p>
        <h1 class="veil__title">MOBILE<br />MUSEUM</h1>
        <p class="veil__cn">手机历史博物馆</p>

        <div v-if="!museum.state.ready" class="veil__loading" aria-live="polite">
          <p class="veil__label mono">正在布展</p>
          <div class="veil__bar" aria-hidden="true">
            <div class="veil__bar-fill" :style="{ transform: `scaleX(${museum.state.progress})` }"></div>
          </div>
          <p class="veil__percent mono">{{ percent }}%</p>
        </div>

        <div v-else class="veil__enter">
          <MuseumButton variant="cta" size="lg" @click="enter">进入博物馆</MuseumButton>
          <p class="veil__label mono">一部手机，不只是一台手机</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.veil {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: $c-bg;
  display: flex;
  align-items: center;
  justify-content: center;

  &__inner {
    text-align: center;
    width: min(420px, 86vw);
  }

  &__title {
    font-size: clamp(40px, 9vw, 72px);
    font-weight: 200;
    line-height: 0.95;
    letter-spacing: -0.02em;
  }

  &__cn {
    font-size: clamp(16px, 3vw, 22px);
    font-weight: 250;
    letter-spacing: 0.5em;
    margin-top: $sp-4;
    margin-bottom: $sp-8;
    text-indent: 0.5em; // 平衡最后一个字符的字距
    color: $c-text-2;
  }

  &__label {
    @include label-style(10px);
    margin-bottom: $sp-4;
  }

  &__bar {
    height: 1px;
    background: $c-line-soft;
    margin: $sp-4 auto;
    width: 240px;
    max-width: 70vw;
    overflow: hidden;

    &-fill {
      height: 100%;
      background: $c-text;
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.4s var(--ease-museum);
    }
  }

  &__percent {
    @include label-style(10px);
    color: $c-text-3;
  }

  &__enter {
    display: flex;
    flex-direction: column;
    gap: $sp-5;
    align-items: center;

    .veil__label {
      margin-bottom: 0;
    }
  }
}

.veil-leave-active {
  transition: opacity 0.9s var(--ease-museum), visibility 0.9s;
  pointer-events: none;
}

.veil-leave-to {
  opacity: 0;
}
</style>
