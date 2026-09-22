<script setup lang="ts">
import { ref } from 'vue'
import type { ExplodedPartSpec } from '@/data/exhibits'

// Exploded 控制（V0.5 规范 §9–§11）：
// EXPLODE 滑杆 + 0/25/50/75/100 快照，动画完全可逆；
// 点击部件 → floating label / bottom sheet（part 事件给场景聚焦）。

const props = defineProps<{
  parts: ExplodedPartSpec[]
  activePartId?: string | null
  explode: number
}>()

const emit = defineEmits<{
  scrub: [t: number]
  select: [partId: string]
}>()

const SNAP_POINTS = [0, 0.25, 0.5, 0.75, 1]
const localT = ref(props.explode)

function onInput(e: Event) {
  const t = Number((e.target as HTMLInputElement).value) / 100
  localT.value = t
  emit('scrub', t)
}

function snap(t: number) {
  localT.value = t
  emit('scrub', t)
}

const pctLabel = ref('')
function onScrubStart() {
  pctLabel.value = `${Math.round(localT.value * 100)}%`
}
</script>

<template>
  <div class="structure">
    <div class="structure__slider" role="group" aria-label="拆解进度">
      <p class="label structure__label">EXPLODE <span class="mono">{{ Math.round(localT * 100) }}%</span></p>
      <input
        class="structure__range"
        type="range"
        min="0"
        max="100"
        step="1"
        :value="Math.round(localT * 100)"
        aria-label="拆解程度"
        @input="onInput"
        @pointerdown="onScrubStart"
      />
      <div class="structure__snaps" aria-hidden="false">
        <button
          v-for="p in SNAP_POINTS"
          :key="p"
          class="mono structure__snap"
          :class="{ 'structure__snap--on': Math.abs(localT - p) < 0.02 }"
          @click="snap(p)"
        >
          {{ Math.round(p * 100) }}%
        </button>
      </div>
    </div>

    <ul class="structure__parts" aria-label="部件清单">
      <li v-for="part in parts" :key="part.id">
        <button
          class="structure__part"
          :class="{ 'structure__part--on': activePartId === part.id }"
          @click="emit('select', part.id)"
        >
          <span class="mono structure__part-no">{{ String(parts.indexOf(part) + 1).padStart(2, '0') }}</span>
          <span class="structure__part-name">{{ part.name }}</span>
          <span class="mono structure__part-arrow" aria-hidden="true">→</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.structure {
  display: flex;
  flex-direction: column;
  gap: $sp-5;

  &__slider {
    padding: $sp-4 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
  }

  &__label {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: $c-text-2;
    margin-bottom: $sp-2;

    .mono {
      color: $c-accent;
    }
  }

  &__range {
    width: 100%;
    accent-color: #b8b2a4;
    height: 28px;
    cursor: ew-resize;
  }

  &__snaps {
    margin-top: $sp-1;
    display: flex;
    justify-content: space-between;
  }

  &__snap {
    font-size: 9px;
    padding: 4px 10px;
    border-radius: 999px;
    color: $c-text-3;
    border: 1px solid transparent;
    transition: color 0.3s var(--ease-museum), border-color 0.3s var(--ease-museum);

    &--on {
      color: $c-accent;
      border-color: rgba(184, 178, 164, 0.4);
    }
  }

  &__parts {
    display: flex;
    flex-direction: column;
  }

  &__part {
    width: 100%;
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-3 $sp-2;
    border-top: 1px solid $c-line-soft;
    text-align: left;
    transition: background 0.3s var(--ease-museum);

    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    &--on {
      .structure__part-name {
        color: $c-accent;
      }
    }
  }

  &__part-no {
    font-size: 10px;
    color: $c-text-3;
  }

  &__part-name {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__part-arrow {
    margin-left: auto;
    color: $c-text-3;
  }
}
</style>
