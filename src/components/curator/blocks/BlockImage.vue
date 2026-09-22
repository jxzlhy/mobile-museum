<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ExhibitionBlock, ImageBlockData } from '@/services/curator/types'
import { phoneService } from '@/services/phoneService'
import { resolvePhoneImage, assetSrc, ANGLE_LABELS } from '@/data/assets'
import type { Phone } from '@/data/types'

// Image Block：引用 approved 资产角度（§36 真实资产优先），
// 不上传、不生成新图。无 approved 图 → 降级提示。
const props = defineProps<{ block: ExhibitionBlock }>()
const data = computed(() => props.block.data as ImageBlockData)
const phone = ref<Phone>()

watch(
  () => data.value.phoneId,
  async (id) => {
    phone.value = id ? await phoneService.getPhoneById(id) : undefined
  },
  { immediate: true },
)

const asset = computed(() => (phone.value ? resolvePhoneImage(phone.value, data.value.angle ?? 'hero') : undefined))
</script>

<template>
  <figure class="bi">
    <p v-if="!phone" class="mono bi-missing">EXHIBIT UNAVAILABLE</p>
    <p v-else-if="!asset" class="mono bi-missing">IMAGE UNAVAILABLE · 图版待补</p>
    <template v-else>
      <img :src="assetSrc(asset)" :alt="asset.alt ?? `${phone!.name} ${ANGLE_LABELS[data.angle ?? 'hero']}`" class="bi__img" loading="lazy" decoding="async" />
      <figcaption class="label bi__cap">
        {{ phone!.name }} · {{ ANGLE_LABELS[data.angle ?? 'hero'] }}
        <template v-if="asset.source?.author"> · Photo: {{ asset.source.author }}</template>
      </figcaption>
    </template>
  </figure>
</template>

<style lang="scss" scoped>
.bi {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $sp-2;

  &-missing {
    font-size: 10px;
    color: $c-text-3;
    letter-spacing: 0.15em;
  }

  &__img {
    max-height: 320px;
    max-width: 100%;
    object-fit: contain;
    border-radius: 12px;
  }

  &__cap {
    font-size: 8px;
    color: $c-text-3;
    letter-spacing: 0.18em;
    text-align: center;
    word-break: keep-all;
  }
}
</style>
