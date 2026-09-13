<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Phone } from '@/data/types'
import { phoneImageList, ANGLE_LABELS } from '@/data/assets'

// REAL PHOTO GALLERY（规范 §23–§25 / §66–§67）：
// 只展示 approved 真实图（resolver 过滤）；图是主角，UI 仅提供视角切换。
// Mobile: 左右滑动 / 点按关闭；Desktop: 方向键 / Esc。

const props = defineProps<{
  phone: Phone
}>()

const images = computed(() => phoneImageList(props.phone))
const activeIndex = ref(0)
const fullscreen = ref(false)

const active = computed(() => images.value[activeIndex.value])

function open(i: number) {
  activeIndex.value = i
  fullscreen.value = true
}

function close() {
  fullscreen.value = false
}

function step(dir: -1 | 1) {
  const n = images.value.length
  if (n === 0) return
  activeIndex.value = (activeIndex.value + dir + n) % n
}

let touchX = 0
function onTouchStart(e: TouchEvent) {
  touchX = e.touches[0]?.clientX ?? 0
}
function onTouchEnd(e: TouchEvent) {
  const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX
  if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1)
}

function onKey(e: KeyboardEvent) {
  if (!fullscreen.value) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const phoneName = computed(() => props.phone.name)
</script>

<template>
  <div class="gallery">
    <div v-if="images.length > 1" class="gallery__tabs" role="tablist" aria-label="实拍视角">
      <button
        v-for="(img, i) in images"
        :key="img.path"
        class="gallery__tab mono"
        :class="{ 'gallery__tab--active': i === activeIndex }"
        role="tab"
        :aria-selected="i === activeIndex"
        @click="activeIndex = i"
      >
        {{ ANGLE_LABELS[img.angle] ?? img.angle }}
      </button>
    </div>

    <button
      v-if="active"
      class="gallery__stage"
      :aria-label="`放大查看：${active.alt ?? phoneName}`"
      @click="open(activeIndex)"
    >
      <img
        :src="active.path"
        :alt="active.alt ?? `${phone.name} 实拍照片`"
        loading="lazy"
        decoding="async"
        class="gallery__img"
      />
    </button>

    <teleport to="body">
      <transition name="gallery-fade">
        <div
          v-if="fullscreen && active"
          class="lightbox"
          role="dialog"
          aria-modal="true"
          :aria-label="`${phone.name} 实拍大图`"
          @click.self="close"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <button class="lightbox__close" aria-label="关闭" @click="close">✕</button>
          <img
            :src="active.path"
            :alt="active.alt ?? `${phone.name} 实拍照片`"
            class="lightbox__img"
          />
          <div class="lightbox__foot">
            <button
              v-if="images.length > 1"
              class="lightbox__nav"
              aria-label="上一张"
              @click.stop="step(-1)"
            >
              ←
            </button>
            <div class="lightbox__caption">
              <p class="mono lightbox__index">
                {{ activeIndex + 1 }} / {{ images.length }} · {{ ANGLE_LABELS[active.angle] ?? active.angle }}
              </p>
              <p v-if="active.source?.author || active.source?.license" class="label lightbox__attribution">
                Photo: {{ active.source?.author }} · {{ active.source?.license }}
              </p>
            </div>
            <button
              v-if="images.length > 1"
              class="lightbox__nav"
              aria-label="下一张"
              @click.stop="step(1)"
            >
              →
            </button>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<style lang="scss" scoped>
.gallery {
  &__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: $sp-2;
    margin-bottom: $sp-4;
  }

  &__tab {
    @include label-style(10px);
    color: $c-text-3;
    padding: 6px 14px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    transition: color 0.3s var(--ease-museum), border-color 0.3s var(--ease-museum);

    &:hover {
      color: $c-text;
    }

    &--active {
      color: #0a0a0a;
      background: rgba(255, 255, 255, 0.9);
      border-color: transparent;
    }
  }

  &__stage {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: $sp-6;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid $c-line-soft;
    cursor: zoom-in;
  }

  &__img {
    max-height: 46vh;
    object-fit: contain;
    filter: drop-shadow(0 18px 44px rgba(0, 0, 0, 0.6));
  }
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(4, 4, 4, 0.94);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $sp-6;

  &__img {
    max-width: min(88vw, 900px);
    max-height: 72vh;
    object-fit: contain;
  }

  &__close {
    position: absolute;
    top: calc(#{$sp-4} + env(safe-area-inset-top));
    right: $sp-5;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid $c-line;
    color: $c-text;
    font-size: 14px;
  }

  &__foot {
    margin-top: $sp-5;
    display: flex;
    align-items: center;
    gap: $sp-5;
  }

  &__nav {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid $c-line;
    color: $c-text;
    font-size: 16px;
  }

  &__index {
    @include label-style(11px);
    color: $c-text-2;
    text-align: center;
  }

  &__attribution {
    font-size: 9px;
    margin-top: $sp-1;
    text-align: center;
  }
}

.gallery-fade-enter-active,
.gallery-fade-leave-active {
  transition: opacity 0.3s var(--ease-museum);
}

.gallery-fade-enter-from,
.gallery-fade-leave-to {
  opacity: 0;
}
</style>
