<script setup lang="ts">
import { computed } from 'vue'
import type { Phone } from '@/data/types'

// 技术 / 规格铭牌（规范 §30）。
const props = defineProps<{ phone: Phone }>()

const rows = computed(() => {
  const p = props.phone
  const out: Array<[string, string]> = []
  if (p.specs?.display) out.push(['屏幕', `${p.specs.displaySize ? p.specs.displaySize + '" · ' : ''}${p.specs.display}`])
  if (p.specs?.camera) out.push(['相机', p.specs.camera])
  if (p.specs?.cameraFront) out.push(['前置', p.specs.cameraFront])
  if (p.specs?.network?.length) out.push(['网络', p.specs.network.join(' · ')])
  if (p.specs?.operatingSystem) out.push(['系统', p.specs.operatingSystem])
  if (p.specs?.battery) out.push(['电池', p.specs.battery])
  if (p.specs?.weight) out.push(['重量', `${p.specs.weight} 克`])
  if (p.specs?.dimensions) out.push(['尺寸', p.specs.dimensions])
  if (p.technologies?.length) out.push(['技术特性', p.technologies.join(' · ')])
  return out
})
</script>

<template>
  <dl class="specs">
    <div v-for="[k, v] in rows" :key="k" class="specs__row">
      <dt class="label">{{ k }}</dt>
      <dd class="mono specs__value">{{ v }}</dd>
    </div>
  </dl>
</template>

<style lang="scss" scoped>
.specs {
  padding: $sp-5;

  &__row {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: $sp-4;
    padding-block: $sp-3;
    border-top: 1px solid rgba(255, 255, 255, 0.08);

    &:first-child {
      border-top: none;
    }
  }

  &__value {
    color: $c-text-2;
    font-size: 13px;
    word-break: keep-all;
  }
}
</style>
