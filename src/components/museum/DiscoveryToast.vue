<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { discoveryService } from '@/services/discoveryService'
import { phoneService } from '@/services/phoneService'
import type { MuseumDiscovery } from '@/data/types'

// Discovery Animation（规范 §41）：非常克制 ——
// 「EXHIBIT DISCOVERED / MM / 012 / 名称」出现约 1.2 秒后消失。

const current = ref<MuseumDiscovery | null>(null)
const phoneName = ref('')
const exhibitNo = ref('')
let hideTimer: ReturnType<typeof setTimeout> | null = null
let seq = 0

const off = discoveryService.onChange(async (d) => {
  const mySeq = ++seq
  const phone = await phoneService.getPhoneById(d.phoneId)
  if (mySeq !== seq) return
  current.value = d
  exhibitNo.value = phone?.exhibitNo ?? 'MM'
  phoneName.value = phone ? `${phone.name} · ${phone.releaseYear}` : d.phoneId
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (mySeq === seq) current.value = null
  }, 1200)
})

onUnmounted(() => {
  off()
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<template>
  <transition name="discovery">
    <div v-if="current" class="discovery" role="status" aria-live="polite">
      <p class="label discovery__head">EXHIBIT DISCOVERED</p>
      <p class="mono discovery__no">{{ exhibitNo }}</p>
      <p class="discovery__name">{{ phoneName }}</p>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.discovery {
  position: fixed;
  left: 50%;
  bottom: calc(96px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 80;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: $sp-4 $sp-6;
  border-radius: 14px;
  background: rgba(12, 12, 12, 0.86);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(184, 178, 164, 0.4);
  pointer-events: none;

  &__head {
    font-size: 9px;
    letter-spacing: 0.3em;
    color: $c-text-2;
  }

  &__no {
    font-size: 13px;
    letter-spacing: 0.25em;
    color: $c-accent;
  }

  &__name {
    font-size: 13px;
    color: $c-text-2;
    word-break: keep-all;
  }
}

.discovery-enter-active {
  transition: opacity 0.3s var(--ease-museum), transform 0.3s var(--ease-museum);
}

.discovery-leave-active {
  transition: opacity 0.45s var(--ease-museum), transform 0.45s var(--ease-museum);
}

.discovery-enter-from,
.discovery-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
