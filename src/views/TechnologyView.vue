<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { technologyService } from '@/services/technologyService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import type { Technology } from '@/data/types'

// 技术馆（规范 §30–§34）：六个章节，每章一条演进脉络。

useStageScene(() => new AmbientScene())

const technologies = ref<Technology[]>([])
const loading = ref(true)

onMounted(async () => {
  technologies.value = await technologyService.getTechnologies()
  loading.value = false
  document.title = '技术馆 — 手机历史博物馆'
})
</script>

<template>
  <div class="page tech container">
    <header class="tech__head">
      <p class="label">六个章节</p>
      <h1 class="heading-1" style="margin-top: 16px">技术馆</h1>
      <p class="body-lg tech__intro">
        屏幕、影像、网络、处理器、电池与形态——塑造你所握过的每一部手机的六种力量。
      </p>
    </header>

    <p v-if="loading" class="label" style="padding-block: 64px">展厅开放中……</p>

    <section
      v-for="(t, ti) in technologies"
      :key="t.id"
      class="tech__chapter hairline-top"
    >
      <header class="tech__chapter-head">
        <span class="tech__index mono">{{ String(ti + 1).padStart(2, '0') }}</span>
        <h2 class="heading-2">{{ t.name }}</h2>
        <!-- V0.6 §24 / §37：TECHNOLOGY NETWORK → 关系图谱 -->
        <router-link :to="`/explore/graph?focus=technology:${t.id}`" class="tech__network label" data-cursor="图谱">
          VIEW TECHNOLOGY NETWORK →
        </router-link>
      </header>
      <p class="body-md tech__desc">{{ t.description }}</p>

      <ol class="tech__milestones">
        <li v-for="m in t.milestones" :key="m.year + m.label" class="tech__milestone">
          <p class="tech__milestone-year mono">{{ m.year }}</p>
          <div>
            <p class="tech__milestone-label">{{ m.label }}</p>
            <p v-if="m.description" class="body-md tech__milestone-desc">{{ m.description }}</p>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.tech {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head {
    .label {
      margin-bottom: $sp-2;
    }
  }

  &__intro {
    margin-top: $sp-5;
    max-width: 52ch;
  }

  &__chapter {
    margin-top: $sp-8;
    padding-top: $sp-7;
  }

  &__chapter-head {
    display: flex;
    align-items: baseline;
    gap: $sp-5;

    .tech__index {
      color: $c-accent;
      font-size: 13px;
    }

    .tech__network {
      margin-left: auto;
      color: $c-accent;
      word-break: keep-all;

      &:hover {
        color: $c-text;
      }
    }
  }

  &__desc {
    margin-top: $sp-4;
    max-width: 56ch;
  }

  &__milestones {
    margin-top: $sp-6;
    display: flex;
    flex-direction: column;
    position: relative;

    // Progression spine
    &::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 8px;
      bottom: 8px;
      width: 1px;
      background: $c-line-soft;
    }
  }

  &__milestone {
    position: relative;
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: $sp-5;
    padding-block: $sp-3;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 18px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: $c-bg;
      border: 1px solid $c-text-3;
    }
  }

  &__milestone-year {
    color: $c-accent;
    font-size: 13px;
  }

  &__milestone-label {
    font-size: 16px;
    font-weight: 350;
  }

  &__milestone-desc {
    margin-top: 2px;
    max-width: 52ch;
  }
}
</style>
