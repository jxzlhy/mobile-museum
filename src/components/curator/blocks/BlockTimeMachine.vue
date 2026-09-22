<script setup lang="ts">
import { computed } from 'vue'
import type { ExhibitionBlock, TimeMachineBlockData } from '@/services/curator/types'
import { getSceneById } from '@/data/scenes'

// Time Machine Block（V0.8 §16）：只保存 year / sceneId / relatedPhoneIds，
// 场景数据在运行时由 V0.7 服务提供。
const props = defineProps<{ block: ExhibitionBlock }>()
const data = computed(() => props.block.data as TimeMachineBlockData)
const scene = computed(() => (data.value.sceneId ? getSceneById(data.value.sceneId) : undefined))
</script>

<template>
  <div class="btm">
    <p v-if="!scene" class="mono ttm-missing">SCENE UNAVAILABLE</p>
    <router-link v-else :to="`/museum/time-machine/${data.year}`" class="btm__card">
      <p class="mono btm__year">{{ data.year }}</p>
      <p class="btm__title">{{ scene.titleZh }}</p>
      <p class="label btm__sub">{{ scene.title }} · {{ scene.sceneType.toUpperCase() }}</p>
      <span class="mono btm__go" aria-hidden="true">进入场景 →</span>
    </router-link>
  </div>
</template>

<style lang="scss" scoped>
.btm {
  &__missing {
    font-size: 10px;
    color: $c-text-3;
    letter-spacing: 0.15em;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: $sp-1;
    padding: $sp-5;
    border: 1px solid rgba(184, 178, 164, 0.3);
    border-radius: 16px;
    transition: border-color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

    &:hover {
      border-color: rgba(184, 178, 164, 0.6);
      background: rgba(255, 255, 255, 0.03);
    }
  }

  &__year {
    font-size: clamp(26px, 4vw, 40px);
    color: $c-accent;
    letter-spacing: 0.1em;
  }

  &__title {
    font-size: 17px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__sub {
    font-size: 8px;
    color: $c-text-3;
    letter-spacing: 0.2em;
  }

  &__go {
    margin-top: $sp-2;
    font-size: 10px;
    color: $c-text-2;
  }
}
</style>
