<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import type { ExhibitionBlock, ExhibitBlockData } from '@/services/curator/types'
import { phoneService } from '@/services/phoneService'
import { useMuseum } from '@/composables/useMuseum'
import { ExhibitViewer } from '@/three/core/ExhibitViewer'
import PhonePhoto from '@/components/common/PhonePhoto.vue'

// Exhibit Block（V0.8 规范 §9 / §11 / §49）：
// FACT（官方事实）与 CURATOR NOTE（个人注释）视觉分离；
// 用户只能覆盖展示层（标题/模式/注释），事实只读。
// displayMode '3d' 仅在 Preview（interactive）时加载 3D（§50–§51）。

const props = defineProps<{ block: ExhibitionBlock; interactive?: boolean }>()

const museum = useMuseum()
const data = computed(() => props.block.data as ExhibitBlockData)
const phone = ref<Awaited<ReturnType<typeof phoneService.getPhoneById>>>()
const missing = computed(() => phone.value === undefined)

phoneService.getPhoneById(data.value.phoneId).then((p) => (phone.value = p))

const has3d = computed(() => Boolean(phone.value?.model) && museum.state.webgl)
const show3d = computed(() => data.value.displayMode === '3d' && has3d.value && props.interactive)

const canvasEl = ref<HTMLCanvasElement>()
let viewer: ExhibitViewer | null = null
watch(
  show3d,
  async (on) => {
    if (!on) {
      viewer?.dispose()
      viewer = null
      return
    }
    await nextTick()
    if (!canvasEl.value || viewer) return
    try {
      viewer = new ExhibitViewer(canvasEl.value)
      await viewer.load(phone.value!.model!)
    } catch {
      viewer?.dispose()
      viewer = null
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => viewer?.dispose())
</script>

<template>
  <div class="bx">
    <p v-if="missing" class="mono bx__missing">EXHIBIT UNAVAILABLE</p>
    <template v-else-if="phone">
      <div class="bx__fact">
        <p class="label bx__kind">FACT</p>
        <div class="bx__media">
          <canvas v-if="show3d" ref="canvasEl" class="bx__canvas" aria-label="3D 展品" />
          <PhonePhoto v-else-if="data.displayMode !== 'minimal'" :phone="phone" class="bx__photo" />
        </div>
        <div class="bx__body">
          <p class="mono bx__year">{{ phone.releaseYear }}</p>
          <h3 class="bx__name">{{ data.titleOverride || phone.name }}</h3>
          <p class="label bx__brand">{{ phone.brandName }}<template v-if="data.titleOverride"> · {{ phone.name }}</template></p>
          <p v-if="data.displayMode === '3d' && !interactive && has3d" class="label bx__3dbadge">3D 可用 · Preview 中呈现</p>
        </div>
      </div>
      <aside v-if="data.note" class="bx__note">
        <p class="label bx__note-kind">CURATOR NOTE</p>
        <p class="bx__note-text">{{ data.note }}</p>
      </aside>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.bx {
  &__missing {
    font-size: 10px;
    letter-spacing: 0.2em;
    color: $c-text-3;
    padding: $sp-4;
    border: 1px dashed $c-line-soft;
    border-radius: 12px;
  }

  &__fact {
    display: flex;
    gap: $sp-5;
    align-items: center;
    flex-wrap: wrap;
  }

  &__kind {
    position: absolute;
    top: -18px;
    font-size: 8px;
    color: $c-text-3;
    letter-spacing: 0.28em;
  }

  &__fact {
    position: relative;
  }

  &__media {
    width: 120px;
    height: 150px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    background: radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, 0.04), transparent 70%);
    overflow: hidden;
  }

  &__photo {
    max-height: 140px;
    display: flex;
    align-items: center;
  }

  &__canvas {
    width: 100%;
    height: 100%;
    cursor: grab;
  }

  &__year {
    font-size: 11px;
    color: $c-accent;
    letter-spacing: 0.25em;
  }

  &__name {
    margin-top: $sp-1;
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 250;
    word-break: keep-all;
  }

  &__brand {
    margin-top: $sp-1;
    font-size: 9px;
    color: $c-text-3;
  }

  &__3dbadge {
    margin-top: $sp-2;
    font-size: 8px;
    color: $c-accent;
  }

  &__note {
    margin-top: $sp-4;
    padding-left: $sp-4;
    border-left: 2px solid rgba(184, 178, 164, 0.5);
  }

  &__note-kind {
    font-size: 8px;
    color: $c-accent;
    letter-spacing: 0.28em;
  }

  &__note-text {
    margin-top: $sp-1;
    font-size: 15px;
    font-style: italic;
    color: $c-text-2;
    line-height: 1.7;
  }
}
</style>
