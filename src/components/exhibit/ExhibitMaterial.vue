<script setup lang="ts">
import type { MaterialInfo } from '@/data/exhibits'

// Material Explorer（V0.5 规范 §13–§14）：
// 重点不是换颜色，而是解释「为什么这个位置使用这种材料」。
// 无资料时显示 MATERIAL DATA NOT DOCUMENTED（§40）。

const props = defineProps<{
  materials: MaterialInfo[]
  activeMaterialId?: string | null
}>()

const emit = defineEmits<{
  select: [materialId: string]
}>()

void props
</script>

<template>
  <div class="material">
    <nav class="material__list" aria-label="材料清单">
      <button
        v-for="m in materials"
        :key="m.id"
        class="material__chip"
        :class="{ 'material__chip--on': activeMaterialId === m.id }"
        @click="emit('select', m.id)"
      >
        {{ m.name }}
      </button>
    </nav>

    <template v-if="activeMaterialId">
      <article
        v-for="m in materials.filter((v) => v.id === activeMaterialId)"
        :key="m.id"
        class="material__info glass-card"
      >
        <p class="label material__kind">MATERIAL</p>
        <h3 class="material__name">{{ m.name }}</h3>
        <p v-if="m.description" class="body-md material__desc">{{ m.description }}</p>

        <div v-if="m.properties?.length" class="material__props">
          <span v-for="p in m.properties" :key="p" class="mono material__prop">{{ p }}</span>
        </div>

        <p v-if="m.reason" class="material__reason body-md">
          <span class="label material__why">WHY HERE · 为什么用它</span>
          {{ m.reason }}
        </p>
        <p v-else class="material__nodata mono">MATERIAL DATA<br />NOT DOCUMENTED</p>
      </article>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.material {
  display: flex;
  flex-direction: column;
  gap: $sp-4;

  &__list {
    display: flex;
    gap: $sp-2;
    flex-wrap: wrap;
  }

  &__chip {
    padding: 8px 16px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-2;
    font-size: 13px;
    transition: border-color 0.3s var(--ease-museum), color 0.3s var(--ease-museum);

    &:hover {
      color: $c-text;
    }

    &--on {
      color: $c-accent;
      border-color: rgba(184, 178, 164, 0.55);
    }
  }

  &__info {
    padding: $sp-5;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-2;
  }

  &__kind {
    font-size: 9px;
    color: $c-text-3;
  }

  &__name {
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 250;
  }

  &__desc {
    color: $c-text-2;
  }

  &__props {
    display: flex;
    gap: $sp-2;
    flex-wrap: wrap;
  }

  &__prop {
    font-size: 10px;
    letter-spacing: 0.16em;
    padding: 5px 12px;
    border: 1px solid rgba(184, 178, 164, 0.35);
    border-radius: 999px;
    color: $c-accent;
  }

  &__reason {
    margin-top: $sp-2;
    color: $c-text-2;
    line-height: 1.8;
  }

  &__why {
    display: block;
    margin-bottom: $sp-1;
    font-size: 9px;
    color: $c-text-3;
  }

  &__nodata {
    margin-top: $sp-2;
    font-size: 11px;
    line-height: 1.8;
    color: $c-text-3;
    letter-spacing: 0.18em;
  }
}
</style>
