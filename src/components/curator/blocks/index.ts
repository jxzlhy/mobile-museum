import { defineAsyncComponent, type Component } from 'vue'
import type { BlockType } from '@/services/curator/types'

// Block Renderer Registry（V0.8 规范 §46）：type → 渲染组件。
// 动态导入：Preview 只加载当前 Block 的组件（§51）。

const renderers: Record<BlockType, Component> = {
  exhibit: defineAsyncComponent(() => import('./BlockExhibit.vue')),
  text: defineAsyncComponent(() => import('./BlockText.vue')),
  quote: defineAsyncComponent(() => import('./BlockQuote.vue')),
  timeline: defineAsyncComponent(() => import('./BlockTimeline.vue')),
  comparison: defineAsyncComponent(() => import('./BlockComparison.vue')),
  graph: defineAsyncComponent(() => import('./BlockGraph.vue')),
  'time-machine': defineAsyncComponent(() => import('./BlockTimeMachine.vue')),
  image: defineAsyncComponent(() => import('./BlockImage.vue')),
  transition: defineAsyncComponent(() => import('./BlockTransition.vue')),
}

export function getRenderer(type: BlockType): Component | undefined {
  return renderers[type]
}
