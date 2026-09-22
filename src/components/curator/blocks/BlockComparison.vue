<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ExhibitionBlock, ComparisonBlockData } from '@/services/curator/types'
import { phoneService } from '@/services/phoneService'
import type { Phone } from '@/data/types'
import PhonePhoto from '@/components/common/PhonePhoto.vue'

// Comparison Block（V0.8 §14）：只保存 leftPhoneId / rightPhoneId，
// 规格在运行时解析 —— 不保存整份规格。
const props = defineProps<{ block: ExhibitionBlock }>()
const data = computed(() => props.block.data as ComparisonBlockData)

const left = ref<Phone>()
const right = ref<Phone>()

watch(
  () => [data.value.leftPhoneId, data.value.rightPhoneId],
  async ([l, r]) => {
    left.value = l ? await phoneService.getPhoneById(l) : undefined
    right.value = r ? await phoneService.getPhoneById(r) : undefined
  },
  { immediate: true },
)

const rows = computed(() => {
  if (!left.value || !right.value) return []
  const a = left.value
  const b = right.value
  const out: Array<[string, string, string]> = []
  out.push(['年份', String(a.releaseYear), String(b.releaseYear)])
  if (a.specs?.weight && b.specs?.weight) out.push(['重量', `${a.specs.weight} g`, `${b.specs.weight} g`])
  if (a.specs?.displaySize && b.specs?.displaySize) out.push(['屏幕', `${a.specs.displaySize}"`, `${b.specs.displaySize}"`])
  if (a.specs?.camera && b.specs?.camera) out.push(['相机', a.specs.camera.split('（')[0], b.specs.camera.split('（')[0]])
  out.push(['相隔', '', `${Math.abs(b.releaseYear - a.releaseYear)} 年`])
  return out
})
</script>

<template>
  <div class="bcp">
    <p v-if="!left || !right" class="mono bcp__missing">EXHIBIT UNAVAILABLE</p>
    <template v-else>
      <div class="bcp__pair">
        <div class="bcp__side">
          <PhonePhoto :phone="left" class="bcp__art" />
          <p class="bcp__name">{{ left.name }}</p>
        </div>
        <p class="mono bcp__vs" aria-hidden="true">VS</p>
        <div class="bcp__side">
          <PhonePhoto :phone="right" class="bcp__art" />
          <p class="bcp__name">{{ right.name }}</p>
        </div>
      </div>
      <dl class="bcp__rows">
        <div v-for="[k, va, vb] in rows" :key="k" class="bcp__row">
          <span class="mono">{{ va || '—' }}</span>
          <dt class="label">{{ k }}</dt>
          <span class="mono">{{ vb || '—' }}</span>
        </div>
      </dl>
      <p v-if="data.label" class="label bcp__label">{{ data.label }}</p>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.bcp {
  &__missing {
    font-size: 10px;
    color: $c-text-3;
    letter-spacing: 0.15em;
  }

  &__pair {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $sp-6;
  }

  &__side {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $sp-2;
  }

  &__art {
    height: 110px;
    display: flex;
    align-items: center;
  }

  &__name {
    font-size: 14px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__vs {
    font-size: 11px;
    color: $c-accent;
    letter-spacing: 0.2em;
  }

  &__rows {
    margin-top: $sp-4;
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: $sp-4;
    align-items: center;
    padding-block: $sp-2;
    border-top: 1px solid rgba(255, 255, 255, 0.07);

    .mono {
      font-size: 13px;
      color: $c-text-2;
      word-break: keep-all;

      &:first-child {
        text-align: right;
      }
    }

    dt {
      font-size: 8px;
      color: $c-text-3;
    }
  }

  &__label {
    margin-top: $sp-3;
    text-align: center;
    font-size: 9px;
    color: $c-accent;
  }
}
</style>
