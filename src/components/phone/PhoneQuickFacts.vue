<script setup lang="ts">
import { computed } from 'vue'
import type { Phone } from '@/data/types'

// Quick Facts（规范 §26）：少量高价值信息，展签而非规格表。
const props = defineProps<{ phone: Phone }>()

const facts = computed(() => {
  const p = props.phone
  const out: Array<{ label: string; value: string }> = []
  out.push({ label: '年份', value: String(p.releaseYear) })
  if (p.specs?.weight) out.push({ label: '重量', value: `${p.specs.weight} g` })
  if (p.specs?.displaySize) out.push({ label: '屏幕', value: `${p.specs.displaySize}"` })
  if (p.specs?.camera) out.push({ label: '相机', value: p.specs.camera.split('（')[0].split(' + ')[0] })
  if (p.exhibitNo) out.push({ label: '编号', value: p.exhibitNo })
  return out.slice(0, 5)
})
</script>

<template>
  <div class="quickfacts">
    <div v-for="f in facts" :key="f.label" class="quickfacts__item">
      <p class="quickfacts__value mono">{{ f.value }}</p>
      <p class="quickfacts__label label">{{ f.label }}</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.quickfacts {
  display: flex;
  flex-wrap: wrap;
  gap: $sp-6;
  padding: $sp-5 $sp-6;

  &__item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 72px;
  }

  &__value {
    font-size: clamp(16px, 2vw, 22px);
    font-weight: 500;
    color: $c-text;
    word-break: keep-all;
  }

  &__label {
    font-size: 9px;
  }
}
</style>
