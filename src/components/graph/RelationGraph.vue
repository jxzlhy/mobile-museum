<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { GraphFocus, MuseumGraphNode } from '@/services/graphService'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useDevice } from '@/composables/useDevice'

// RelationGraph（V0.6 规范 §4 / §50–§52 / §64）：
// Museum Knowledge Map —— 细线、小节点、低对比、柔焦；
// 选中节点高对比。移动端：单指平移 / 双指缩放 / 点按聚焦；
// 桌面端：拖拽平移 / 滚轮缩放 / 悬停预览 / 点击聚焦。
// 不做开发者风数据科学图。

const props = defineProps<{ focus: GraphFocus }>()
const emit = defineEmits<{ select: [nodeId: string] }>()

const reduced = useReducedMotion()
const { isTouch } = useDevice()

const svgEl = ref<SVGSVGElement>()
const W = 800
const H = 560
const pan = ref({ x: 0, y: 0 })
const zoom = ref(1)
const dragging = ref(false)
const hovered = ref<string | null>(null)

/** 径向布局：中心在原点，外围节点按确定性角度排布（1–2 圈）。 */
const layout = computed(() => {
  const neighbors = props.focus.nodes.filter((n) => n.id !== props.focus.center.id)
  const pos = new Map<string, { x: number; y: number }>()
  pos.set(props.focus.center.id, { x: 0, y: 0 })
  const ringA = neighbors.slice(0, Math.ceil(neighbors.length / (neighbors.length > 9 ? 2 : 1)))
  const ringB = neighbors.slice(ringA.length)
  const place = (nodesArr: MuseumGraphNode[], radius: number, offset: number) => {
    nodesArr.forEach((n, i) => {
      const angle = offset + (i / Math.max(nodesArr.length, 1)) * Math.PI * 2
      pos.set(n.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.78 })
    })
  }
  place(ringA, 170, -Math.PI / 2)
  place(ringB, 255, -Math.PI / 2 + Math.PI / Math.max(ringB.length, 1))
  return pos
})

const viewNodes = computed(() =>
  props.focus.nodes.map((n) => ({ node: n, ...layout.value.get(n.id)! })),
)

const viewEdges = computed(() =>
  props.focus.edges
    .filter((e) => layout.value.has(e.source) && layout.value.has(e.target))
    .map((e) => ({
      edge: e,
      x1: layout.value.get(e.source)!.x,
      y1: layout.value.get(e.source)!.y,
      x2: layout.value.get(e.target)!.x,
      y2: layout.value.get(e.target)!.y,
    })),
)

function nodeAt(nodeId: string) {
  return viewNodes.value.find((v) => v.node.id === nodeId)
}

// ---- 平移 / 缩放（§50 / §51）----
let downX = 0
let downY = 0
let moved = false
const pointers = new Map<number, { x: number; y: number }>()
let pinchDist = 0

function onDown(e: PointerEvent) {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
    return
  }
  downX = e.clientX
  downY = e.clientY
  moved = false
  dragging.value = true
}
function onMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (pinchDist > 0) zoom.value = Math.min(2.2, Math.max(0.6, zoom.value * (d / pinchDist)))
    pinchDist = d
    moved = true
    return
  }
  if (!dragging.value) return
  const dx = e.clientX - downX
  const dy = e.clientY - downY
  if (Math.abs(dx) + Math.abs(dy) > 4) moved = true
  pan.value = { x: pan.value.x + dx, y: pan.value.y + dy }
  downX = e.clientX
  downY = e.clientY
}
function onUp(e: PointerEvent) {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchDist = 0
  dragging.value = false
}
function onWheel(e: WheelEvent) {
  e.preventDefault()
  zoom.value = Math.min(2.2, Math.max(0.6, zoom.value * (e.deltaY > 0 ? 0.92 : 1.08)))
}
function onNodeClick(nodeId: string) {
  if (moved) return
  emit('select', nodeId)
}
function onNodeEnter(id: string) {
  if (!isTouch.value) hovered.value = id
}

watch(
  () => props.focus.center.id,
  () => {
    pan.value = { x: 0, y: 0 }
    zoom.value = 1
  },
)

onMounted(() => {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
})
onUnmounted(() => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
})
</script>

<template>
  <div
    class="rg"
    :class="{ 'rg--dragging': dragging }"
    @pointerdown="onDown"
    @wheel="onWheel"
  >
    <svg
      ref="svgEl"
      class="rg__svg"
      :viewBox="`${-W / 2} ${-H / 2} ${W} ${H}`"
      role="img"
      :aria-label="`关系图：${focus.center.label}，共 ${focus.nodes.length} 个节点`"
    >
      <g
        :transform="`translate(${pan.x} ${pan.y}) scale(${zoom})`"
        :class="{ 'rg__g--enter': !reduced }"
      >
        <!-- 细线（低对比，§4） -->
        <line
          v-for="ve in viewEdges"
          :key="ve.edge.id"
          :x1="ve.x1"
          :y1="ve.y1"
          :x2="ve.x2"
          :y2="ve.y2"
          class="rg__edge"
          :class="{ 'rg__edge--hot': hovered === ve.edge.target || hovered === ve.edge.source }"
        />
        <!-- 外围节点 -->
        <g
          v-for="vn in viewNodes.filter((v) => v.node.id !== focus.center.id)"
          :key="vn.node.id"
          class="rg__node"
          :class="{ 'rg__node--hover': hovered === vn.node.id }"
          :transform="`translate(${vn.x} ${vn.y})`"
          :tabindex="0"
          role="button"
          :aria-label="`${vn.node.label}（${focus.reasons[vn.node.id] ?? vn.node.type}）`"
          @click="onNodeClick(vn.node.id)"
          @keydown.enter="onNodeClick(vn.node.id)"
          @mouseenter="onNodeEnter(vn.node.id)"
          @mouseleave="hovered = null"
        >
          <circle class="rg__dot" :class="`rg__dot--${vn.node.type}`" r="6" />
          <text class="rg__label" y="20" text-anchor="middle">{{ vn.node.label }}</text>
          <text v-if="vn.node.year" class="rg__sub" y="32" text-anchor="middle">{{ vn.node.year }}</text>
        </g>
        <!-- 中心节点（高对比） -->
        <g class="rg__node rg__node--center" :transform="`translate(0 0)`">
          <circle class="rg__dot rg__dot--center" r="10" />
          <text class="rg__label rg__label--center" y="26" text-anchor="middle">{{ focus.center.label }}</text>
        </g>
      </g>
    </svg>
    <p class="label rg__hint">{{ isTouch ? '单指平移 · 双指缩放 · 点按聚焦' : '拖拽平移 · 滚轮缩放 · 点击节点聚焦' }}</p>
  </div>
</template>

<style lang="scss" scoped>
.rg {
  position: relative;
  border: 1px solid $c-line-soft;
  border-radius: 16px;
  background: radial-gradient(ellipse at 50% 40%, rgba(255, 255, 255, 0.03), transparent 70%);
  overflow: hidden;
  touch-action: none;
  cursor: grab;

  &--dragging {
    cursor: grabbing;
  }

  &__svg {
    display: block;
    width: 100%;
    height: 420px;

    @include desktop {
      height: 480px;
    }
  }

  &__g--enter {
    animation: rg-enter 0.7s var(--ease-museum);
  }

  &__edge {
    stroke: rgba(255, 255, 255, 0.14);
    stroke-width: 1;

    &--hot {
      stroke: rgba(184, 178, 164, 0.6);
    }
  }

  &__node {
    cursor: pointer;
    outline: none;

    &:focus-visible {
      .rg__dot {
        stroke: $c-accent;
        stroke-width: 2;
      }
    }

    &--center {
      cursor: default;
    }
  }

  &__dot {
    fill: #2a2a2e;
    stroke: rgba(255, 255, 255, 0.25);
    stroke-width: 1;
    transition: fill 0.3s var(--ease-museum), stroke 0.3s var(--ease-museum);

    &--phone {
      fill: #32323a;
    }

    &--center {
      fill: $c-accent;
      stroke: rgba(255, 255, 255, 0.7);
    }
  }

  &__node--hover {
    .rg__dot {
      stroke: $c-accent;
    }

    .rg__label {
      fill: $c-text;
    }
  }

  &__label {
    fill: rgba(245, 245, 245, 0.72);
    font-size: 11px;
    font-family: var(--font-sans);
    word-break: keep-all;

    &--center {
      fill: $c-text;
      font-size: 13px;
      font-weight: 500;
    }
  }

  &__sub {
    fill: rgba(160, 160, 160, 0.6);
    font-size: 9px;
    font-family: var(--font-mono);
  }

  &__hint {
    position: absolute;
    left: $sp-4;
    bottom: $sp-3;
    font-size: 9px;
    color: $c-text-3;
    pointer-events: none;
  }
}

@keyframes rg-enter {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
