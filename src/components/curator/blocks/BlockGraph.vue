<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ExhibitionBlock, GraphBlockData } from '@/services/curator/types'
import { graphService } from '@/services/graphService'

// Graph Block（V0.8 §15）：只保存 focusId，
// 关系在运行时通过 Graph Service 获取。
const props = defineProps<{ block: ExhibitionBlock }>()
const data = computed(() => props.block.data as GraphBlockData)

const focus = ref<Awaited<ReturnType<typeof graphService.getFocus>>>(null)

watch(
  () => data.value.focusId,
  async (id) => {
    focus.value = id ? await graphService.getFocus(id, 1) : null
  },
  { immediate: true },
)
</script>

<template>
  <div class="bg">
    <p v-if="!focus || focus.nodes.length <= 1" class="mono bg-empty">NO DOCUMENTED CONNECTIONS</p>
    <template v-else>
      <p class="bg-center">{{ focus.center.label }}</p>
      <ul class="bg-list">
        <li v-for="n in focus.nodes.filter((v) => v.id !== focus!.center.id).slice(0, 6)" :key="n.id" class="bg-row">
          <span class="bg-line" aria-hidden="true">└</span>
          <span class="bg-name">{{ n.label }}</span>
          <span class="label bg-rel">{{ focus.reasons[n.id] ?? n.type }}</span>
        </li>
      </ul>
      <router-link :to="`/explore/graph?focus=${data.focusId}`" class="label bg-open">OPEN FULL GRAPH →</router-link>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.bg {
  &-empty {
    font-size: 10px;
    color: $c-text-3;
    letter-spacing: 0.15em;
  }

  &-center {
    font-size: 18px;
    font-weight: 350;
    color: $c-accent;
    word-break: keep-all;
  }

  &-list {
    margin-top: $sp-2;
  }

  &-row {
    display: flex;
    align-items: baseline;
    gap: $sp-2;
    padding-block: 3px;
  }

  &-line {
    color: $c-text-3;
    font-family: var(--font-mono);
  }

  &-name {
    font-size: 14px;
    word-break: keep-all;
  }

  &-rel {
    margin-left: auto;
    font-size: 8px;
    color: $c-text-3;
    word-break: keep-all;
  }

  &-open {
    display: inline-block;
    margin-top: $sp-3;
    color: $c-text-2;

    &:hover {
      color: $c-accent;
    }
  }
}
</style>
