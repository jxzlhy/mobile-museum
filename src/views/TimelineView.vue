<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { phoneService } from '@/services/phoneService'
import { eventService } from '@/services/eventService'
import { useMuseum } from '@/composables/useMuseum'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import { formFactorLabel } from '@/data/formFactors'
import { TimelineAnimation } from '@/animations/timeline/TimelineAnimation'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import type { Phone, HistoricalEvent } from '@/data/types'

// 时间长廊（规范 §20–§23）：空间化的展览，而非一份列表。
// 手机是展品节点；历史事件是穿插其间的文字标记。

type Item = { kind: 'phone'; year: number; phone: Phone } | { kind: 'event'; year: number; event: HistoricalEvent }

const museum = useMuseum()
const loading = ref(true)
const items = ref<Item[]>([])
const trackEl = ref<HTMLElement>()
let animation: TimelineAnimation | null = null

useStageScene(() => new AmbientScene())

onMounted(async () => {
  const [phones, events] = await Promise.all([phoneService.getPhones(), eventService.getEvents()])
  const merged: Item[] = [
    ...phones.map((p) => ({ kind: 'phone', year: p.releaseYear, phone: p }) as Item),
    ...events.map((e) => ({ kind: 'event', year: e.year, event: e }) as Item),
  ]
  merged.sort((a, b) => a.year - b.year)
  items.value = merged
  loading.value = false

  requestAnimationFrame(() => {
    if (trackEl.value) {
      animation = new TimelineAnimation({
        trackEl: trackEl.value,
        reduced: museum.state.motionMode === 'reduced',
      })
    }
  })
})

onUnmounted(() => {
  animation?.destroy()
  animation = null
})
</script>

<template>
  <div class="page timeline">
    <header class="timeline__head container">
      <p class="label">常设展览</p>
      <h1 class="timeline__title heading-1">时间长廊</h1>
      <p class="timeline__years mono">1973 — 2026 · 五十余年</p>
    </header>

    <p v-if="loading" class="label container" style="padding-block: 96px">布展中……</p>

    <div v-else class="tl-wrap">
      <div ref="trackEl" class="tl-track">
        <template v-for="(item, i) in items" :key="item.kind + '-' + i">
          <!-- 历史事件标记 -->
          <article v-if="item.kind === 'event'" class="tl-node tl-node--event">
            <p class="tl-node__year mono">{{ item.year }}</p>
            <p class="tl-node__event-title">{{ item.event.title }}</p>
            <p class="tl-node__event-desc body-md">{{ item.event.description }}</p>
          </article>

          <!-- 手机展品节点 -->
          <article v-else class="tl-node tl-node--phone" data-cursor="看展">
            <p class="tl-node__year year-mid">{{ item.year }}</p>
            <router-link :to="`/phone/${item.phone.id}`" class="tl-node__link" :aria-label="`${item.phone.name}，${item.year}`">
              <span class="tl-node__photo"><PhonePhoto :phone="item.phone" /></span>
              <h2 class="tl-node__name">{{ item.phone.name }}</h2>
            </router-link>
            <p class="tl-node__meta label">{{ item.phone.brandName }} · {{ formFactorLabel(item.phone.formFactor) }}</p>
            <p class="tl-node__sig body-md">{{ item.phone.tagline ?? item.phone.significance }}</p>
            <router-link :to="`/phone/${item.phone.id}`" class="tl-node__cta label">查看展品 →</router-link>
          </article>
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.timeline {
  padding-top: calc(96px + env(safe-area-inset-top));
  padding-bottom: $sp-9;

  &__head {
    margin-bottom: $sp-8;

    .label {
      margin-bottom: $sp-4;
    }
  }

  &__years {
    margin-top: $sp-4;
    color: $c-text-3;
    letter-spacing: 0.3em;
    font-size: 12px;
  }
}

// ---- Mobile: vertical spatial timeline with a spine (spec §21) ----
.tl-track {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-inline: $page-pad-x;

  &::before {
    content: '';
    position: absolute;
    left: calc($page-pad-x - 14px);
    top: 0;
    bottom: 0;
    width: 1px;
    background: $c-line-soft;
  }
}

.tl-node {
  position: relative;
  padding-block: $sp-6;

  &::before {
    content: '';
    position: absolute;
    left: calc(-14px + -3.5px);
    top: 40px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $c-text-3;
  }

  &--phone {
    .tl-node__photo {
      display: flex;
      align-items: flex-end;
      height: 150px;
      margin-block: $sp-3 $sp-2;

      :deep(img) {
        max-height: 100%;
        filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.55));
      }
    }

    @include desktop {
      .tl-node__photo {
        height: 190px;
        align-items: center;
      }
    }
  }

  &__year {
    color: $c-text;
  }

  &__link {
    display: inline-block;
  }

  &__silhouette {
    transition: transform 0.5s var(--ease-museum), opacity 0.5s var(--ease-museum);
    opacity: 0.85;

    &:hover {
      transform: translateY(-4px);
      opacity: 1;
    }
  }

  &__name {
    font-size: 20px;
    font-weight: 350;
    margin-top: $sp-2;
  }

  &__meta {
    margin-top: $sp-2;
    font-size: 10px;
  }

  &__sig {
    margin-top: $sp-2;
    max-width: 46ch;
  }

  &__cta {
    display: inline-block;
    margin-top: $sp-3;
    font-size: 10px;
    color: $c-text-3;
    transition: color 0.3s var(--ease-museum);

    &:hover {
      color: $c-text;
    }
  }

  // Event markers are quieter
  &--event {
    &::before {
      background: transparent;
      border: 1px solid $c-line;
    }

    .tl-node__event-title {
      font-size: 16px;
      font-weight: 400;
      margin-top: $sp-2;
    }

    .tl-node__event-desc {
      max-width: 42ch;
      margin-top: $sp-1;
    }

    .tl-node__year {
      color: $c-accent;
      font-size: 12px;
      letter-spacing: 0.3em;
    }
  }
}

// ---- Desktop: horizontal walk (spec §22) ----
// The spine sits at a fixed y; phone art lives above it, prose below.
@include desktop {
  $spine: 300px;

  .tl-wrap {
    overflow: hidden;
  }

  .tl-track {
    flex-direction: row;
    align-items: flex-start;
    width: max-content;
    gap: $sp-8;
    padding-inline: $page-pad-x;
    padding-block: $sp-8 $sp-9;

    &::before {
      left: 0;
      right: 0;
      top: $spine;
      bottom: auto;
      width: auto;
      height: 1px;
    }
  }

  .tl-node {
    flex: 0 0 340px;
    display: flex;
    flex-direction: column;

    &::before {
      left: 50%;
      top: $spine;
      transform: translate(-50%, -50%);
      margin-top: 0;
    }

    &--phone {
      .tl-node__year {
        font-size: 28px;
        font-weight: 250;
        line-height: 1;
      }

      .tl-node__photo {
        align-self: center;
        height: 170px;
        margin-block: $sp-2 $sp-2;
      }

      .tl-node__name,
      .tl-node__meta,
      .tl-node__sig,
      .tl-node__cta {
        text-align: center;
      }

      // prose starts below the spine
      .tl-node__name {
        margin-top: $spine - 210px;
      }

      .tl-node__sig {
        margin-inline: auto;
      }
    }

    &--event {
      flex: 0 0 260px;

      .tl-node__year {
        margin-top: $spine + 40px;
      }
    }
  }
}
</style>
