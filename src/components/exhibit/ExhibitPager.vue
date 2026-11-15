<script setup lang="ts">
import { useRouter } from 'vue-router'
import MuseumButton from '@/components/common/MuseumButton.vue'

// 返回 / 下一件（§42 / §43 + V0.6 §39 关系图谱）。
defineProps<{
  phoneId: string
  releaseYear: number
  next?: { id: string; name: string } | null
}>()

const router = useRouter()
</script>

<template>
  <nav class="exhibit-pager container" aria-label="展品导航">
    <MuseumButton variant="line" @click="router.back()">← BACK TO MUSEUM</MuseumButton>
    <div class="exhibit-pager__links">
      <router-link class="exhibit-pager__graph label" :to="`/explore/graph?focus=phone:${phoneId}`">
        EXPLORE RELATIONS · 关系图谱 →
      </router-link>
      <router-link class="exhibit-pager__graph label" :to="`/explore/context/${releaseYear}`">
        CONTEXT · {{ releaseYear }} 时代环境 →
      </router-link>
    </div>
    <router-link
      v-if="next"
      :to="`/museum/exhibit/${next.id}`"
      class="exhibit-pager__next"
      data-cursor="下一件"
    >
      <span class="label">NEXT EXHIBIT</span>
      <span class="exhibit-pager__name">{{ next.name }} →</span>
    </router-link>
  </nav>
</template>

<style lang="scss" scoped>
.exhibit-pager {
  margin-top: $sp-7;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: $sp-3;
  flex-wrap: wrap;

  &__links {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-2;
  }

  &__graph {
    color: $c-text-2;
    word-break: keep-all;

    &:hover {
      color: $c-accent;
    }
  }

  &__next {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: $sp-1;
    padding: $sp-4 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
    transition: border-color 0.3s var(--ease-museum);

    .label {
      font-size: 9px;
      color: $c-text-3;
    }

    &:hover {
      border-color: $c-line;
    }
  }

  &__name {
    font-size: 16px;
    font-weight: 350;
    word-break: keep-all;
  }
}
</style>
