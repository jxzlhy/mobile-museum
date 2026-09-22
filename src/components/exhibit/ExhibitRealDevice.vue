<script setup lang="ts">
import { ref, computed } from 'vue'
import { phoneImageList, assetSrc, ANGLE_LABELS } from '@/data/assets'
import type { Phone } from '@/data/types'

// Real Device（V0.5 规范 §5）：approved 实拍图库。
// 横向 snap 滑动 + 缩略图切换 + 原生捏合缩放（touch-action: pinch-zoom）。

const props = defineProps<{ phone: Phone }>()

const images = computed(() => phoneImageList(props.phone))
const activeIndex = ref(0)

function select(i: number) {
  activeIndex.value = Math.max(0, Math.min(images.value.length - 1, i))
}
</script>

<template>
  <div class="real">
    <div class="real__stage" data-cursor="滑动">
      <div
        class="real__track"
        :style="{ transform: `translateX(-${activeIndex * 100}%)` }"
      >
        <figure v-for="img in images" :key="img.path + img.angle" class="real__slide">
          <img
            :src="assetSrc(img)"
            :alt="img.alt ?? `${phone.name} ${ANGLE_LABELS[img.angle] ?? ''}`"
            class="real__img"
            loading="lazy"
            decoding="async"
          />
          <figcaption class="label real__angle">{{ ANGLE_LABELS[img.angle] ?? img.angle }}</figcaption>
        </figure>
      </div>
      <button
        v-if="activeIndex > 0"
        class="real__nav real__nav--prev"
        aria-label="上一张"
        @click="select(activeIndex - 1)"
      >
        ←
      </button>
      <button
        v-if="activeIndex < images.length - 1"
        class="real__nav real__nav--next"
        aria-label="下一张"
        @click="select(activeIndex + 1)"
      >
        →
      </button>
    </div>

    <nav v-if="images.length > 1" class="real__thumbs" aria-label="图片切换">
      <button
        v-for="(img, i) in images"
        :key="'t-' + img.path + img.angle"
        class="real__thumb"
        :class="{ 'real__thumb--on': i === activeIndex }"
        :aria-label="ANGLE_LABELS[img.angle] ?? img.angle"
        @click="select(i)"
      >
        <img :src="assetSrc(img, true)" alt="" loading="lazy" decoding="async" />
      </button>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
.real {
  display: flex;
  flex-direction: column;
  gap: $sp-3;

  &__stage {
    position: relative;
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, 0.045), transparent 70%);
    // 原生捏合缩放（规范 §5：Pinch Zoom）
    touch-action: pinch-zoom pan-y;
  }

  &__track {
    display: flex;
    transition: transform 0.55s var(--ease-museum);
  }

  &__slide {
    flex: 0 0 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $sp-5;
    min-height: 320px;

    @include desktop {
      min-height: 420px;
    }
  }

  &__img {
    max-height: 300px;
    max-width: 100%;
    object-fit: contain;

    @include desktop {
      max-height: 380px;
    }
  }

  &__angle {
    margin-top: $sp-3;
    font-size: 9px;
    color: $c-text-3;
  }

  &__nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(8, 8, 8, 0.6);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
    color: $c-text-2;

    &:hover {
      color: $c-text;
      border-color: rgba(255, 255, 255, 0.3);
    }

    &--prev {
      left: $sp-3;
    }

    &--next {
      right: $sp-3;
    }
  }

  &__thumbs {
    display: flex;
    gap: $sp-2;
    overflow-x: auto;
    padding-bottom: $sp-1;
  }

  &__thumb {
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid $c-line-soft;
    opacity: 0.55;
    transition: opacity 0.3s var(--ease-museum), border-color 0.3s var(--ease-museum);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &--on {
      opacity: 1;
      border-color: rgba(184, 178, 164, 0.6);
    }
  }
}
</style>
