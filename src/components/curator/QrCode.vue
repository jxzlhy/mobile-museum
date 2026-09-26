<script setup lang="ts">
import { computed } from 'vue'
import qrcode from 'qrcode-generator'

// QR（V0.9 规范 §19–§20 / §97）：内容只放公开展览 URL。
// 库不可用时降级为纯链接（§59）——由父组件处理。

const props = defineProps<{ url: string; size?: number }>()

const svg = computed<string | null>(() => {
  try {
    // typeNumber 0 = 自动选版；ecc 'M'
    const qr = qrcode(0, 'M')
    qr.addData(props.url)
    qr.make()
    const count = qr.getModuleCount()
    const cell = 4
    const quiet = 2 // 模块
    const total = (count + quiet * 2) * cell
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">`
    out += `<rect width="${total}" height="${total}" fill="#ffffff"/>`
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          out += `<rect x="${(c + quiet) * cell}" y="${(r + quiet) * cell}" width="${cell}" height="${cell}" fill="#080808"/>`
        }
      }
    }
    out += '</svg>'
    return out
  } catch {
    return null
  }
})

const sizePx = computed(() => `${props.size ?? 260}px`)
</script>

<template>
  <figure class="qr">
    <div v-if="svg" class="qr__box" :style="{ width: sizePx, height: sizePx }" v-html="svg"></div>
    <p v-else class="mono qr__fallback">QR UNAVAILABLE · 请使用复制链接</p>
    <figcaption class="label qr__url">{{ url }}</figcaption>
  </figure>
</template>

<style lang="scss" scoped>
.qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $sp-3;

  &__box {
    background: #fff;
    border-radius: 12px;
    padding: 12px;

    :deep(svg) {
      display: block;
      width: 100%;
      height: 100%;
    }
  }

  &__fallback {
    font-size: 10px;
    color: $c-text-3;
    letter-spacing: 0.15em;
  }

  &__url {
    font-size: 9px;
    color: $c-text-3;
    word-break: break-all;
    max-width: 320px;
    text-align: center;
  }
}
</style>
