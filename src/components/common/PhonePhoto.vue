<script setup lang="ts">
import { computed } from 'vue'
import type { Phone } from '@/data/types'
import { resolvePhoneImage, assetSrc } from '@/data/assets'
import PhoneSilhouette from './PhoneSilhouette.vue'

// 真实展品照片（V0.2.5 §14 统一 Image Resolver / §22 降级规则）：
// 只有 approved 真实图才会渲染；否则线稿回退 + 「图版待补」。

const props = withDefaults(
  defineProps<{
    phone: Phone
    /** 使用缩略地址（列表场景，规范 §24）。 */
    thumb?: boolean
    /** 是否显示「图版待补」标注。 */
    markMissing?: boolean
  }>(),
  { thumb: false, markMissing: false },
)

const asset = computed(() => resolvePhoneImage(props.phone, 'hero'))
const src = computed(() => (asset.value ? assetSrc(asset.value, props.thumb) : undefined))
</script>

<template>
  <figure class="phone-photo">
    <img
      v-if="asset && src"
      :src="src"
      :alt="asset.alt ?? `${phone.name} 实拍照片`"
      loading="lazy"
      decoding="async"
      class="phone-photo__img"
    />
    <div v-else class="phone-photo__fallback">
      <PhoneSilhouette :form="phone.formFactor" class="phone-photo__silhouette" aria-hidden="true" />
      <figcaption v-if="markMissing" class="phone-photo__missing label">图版待补</figcaption>
    </div>
  </figure>
</template>

<style lang="scss" scoped>
.phone-photo {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 12px 30px rgba(0, 0, 0, 0.55));
  }

  &__fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $sp-2;
  }

  &__silhouette {
    width: 70%;
    max-width: 96px;
    opacity: 0.45;
  }

  &__missing {
    font-size: 9px;
    white-space: nowrap;
  }
}
</style>
