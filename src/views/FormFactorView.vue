<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { formFactors } from '@/data/formFactors'
import { phoneService } from '@/services/phoneService'
import { useMuseum } from '@/composables/useMuseum'
import { Stage } from '@/three/core/Stage'
import { PhoneScene } from '@/three/scenes/PhoneScene'
import PhoneSilhouette from '@/components/common/PhoneSilhouette.vue'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import type { Phone } from '@/data/types'

// 形态馆（规范 §34 / §111）：每种形态一节展位，3D 模型随选切换。

const museum = useMuseum()
const selectedId = ref(formFactors[0].id)
const selected = computed(() => formFactors.find((f) => f.id === selectedId.value) ?? formFactors[0])
const representatives = ref<Phone[]>([])
const allPhones = ref<Phone[]>([])

let scene: PhoneScene | null = null

onMounted(async () => {
  allPhones.value = await phoneService.getPhones()
  await mountScene()
  updateRepresentatives()
})

onUnmounted(() => {
  Stage.clearScene()
  scene = null
})

async function mountScene() {
  if (!museum.state.webgl) return
  scene = new PhoneScene(selected.value.modelId)
  await Stage.setScene(scene)
}

watch(selectedId, async () => {
  representatives.value = []
  await mountScene()
  updateRepresentatives()
})

function updateRepresentatives() {
  representatives.value = allPhones.value.filter((p) => p.formFactor === selectedId.value).slice(0, 6)
}

// 360 拖拽（与展品页同一套交互）
let lastX = 0
function onPointerDown(e: PointerEvent) {
  lastX = e.clientX
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}
function onPointerMove(e: PointerEvent) {
  if (!scene || !(e.buttons & 1)) return
  const dx = e.clientX - lastX
  lastX = e.clientX
  scene.dragBy(dx)
}
function onPointerUp() {
  scene?.endDrag()
}
</script>

<template>
  <div class="page ff container">
    <header class="ff__head">
      <p class="label">FORM FACTOR MUSEUM</p>
      <h1 class="ff__title heading-1">形态馆</h1>
      <p class="ff__intro body-lg">手机的样子，是每个时代的宣言。</p>
    </header>

    <div class="ff__hall">
      <!-- 形态选择轨 -->
      <nav class="ff__rail" aria-label="形态选择">
        <button
          v-for="f in formFactors"
          :key="f.id"
          class="ff__tab"
          :class="{ 'ff__tab--active': f.id === selectedId }"
          @click="selectedId = f.id"
        >
          <span class="ff__tab-label">{{ f.label }}</span>
          <span class="ff__tab-en mono">{{ f.en }}</span>
        </button>
      </nav>

      <!-- 展位 -->
      <section class="ff__stage" :key="selected.id">
        <div
          class="ff__drag"
          data-cursor="DRAG"
          aria-hidden="true"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        ></div>
        <PhoneSilhouette
          v-if="!museum.state.webgl"
          :form="selected.id"
          class="ff__fallback"
          aria-hidden="true"
        />
        <div class="ff__plate">
          <p class="ff__plate-en mono">{{ selected.en }} · {{ selected.years }}</p>
          <h2 class="ff__plate-name">{{ selected.label }}</h2>
          <p class="ff__plate-desc body-md">{{ selected.description }}</p>
        </div>
      </section>
    </div>

    <!-- 代表展品 -->
    <section class="ff__reps">
      <p class="label">代表展品 · {{ representatives.length }}</p>
      <nav class="ff__rep-list">
        <div v-for="p in representatives" :key="p.id" class="ff__repwrap">
          <router-link :to="`/phone/${p.id}`" class="ff__rep" data-cursor="VIEW">
            <span class="ff__rep-year mono">{{ p.releaseYear }}</span>
            <span class="ff__rep-art"><PhonePhoto :phone="p" thumb /></span>
            <span class="ff__rep-name">{{ p.name }}</span>
            <span class="ff__rep-brand label">{{ p.brandName }}</span>
            <span class="ff__rep-arrow mono" aria-hidden="true">→</span>
          </router-link>
          <!-- 规范 §46：形态馆 → View Exhibit，直接进入 Museum Hall -->
          <router-link
            :to="`/museum?focus=${p.id}`"
            class="ff__rep-museum label"
            :aria-label="`在博物馆中查看 ${p.name}`"
          >
            看展
          </router-link>
        </div>
      </nav>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.ff {
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
    margin-top: $sp-4;
  }

  &__hall {
    margin-top: $sp-8;
    display: grid;
    gap: $sp-5;

    @include desktop {
      grid-template-columns: 220px 1fr;
      gap: $sp-7;
    }
  }

  &__rail {
    display: flex;
    flex-wrap: wrap;
    gap: $sp-2;
    align-content: flex-start;

    @include desktop {
      flex-direction: column;
      flex-wrap: nowrap;
      gap: 2px;
    }
  }

  &__tab {
    display: flex;
    align-items: baseline;
    gap: $sp-2;
    padding: $sp-2 $sp-3;
    border: 1px solid transparent;
    border-radius: 8px;
    color: $c-text-3;
    transition: color 0.3s var(--ease-museum), border-color 0.3s var(--ease-museum),
      background 0.3s var(--ease-museum);
    text-align: left;

    &-label {
      font-size: 15px;
      font-weight: 350;
    }

    &-en {
      font-size: 9px;
      letter-spacing: 0.18em;
      color: $c-text-3;
    }

    &:hover {
      color: $c-text;
    }

    &--active {
      color: $c-text;
      background: $c-glass;
      border-color: $c-line;

      .ff__tab-en {
        color: $c-accent;
      }
    }
  }

  &__stage {
    position: relative;
    height: 62vh;
    height: 62dvh;
    border: 1px solid $c-line-soft;
    border-radius: 16px;
    overflow: hidden;

    @include desktop {
      height: 64vh;
      height: 64dvh;
    }
  }

  &__drag {
    position: absolute;
    inset: 0;
    touch-action: pan-y;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__fallback {
    position: absolute;
    left: 50%;
    top: 46%;
    transform: translate(-50%, -50%);
    width: 110px;
    opacity: 0.5;
  }

  &__plate {
    position: absolute;
    left: 0;
    bottom: 0;
    padding: $sp-5;
    pointer-events: none;
    max-width: 420px;
  }

  &__plate-en {
    font-size: 10px;
    letter-spacing: 0.22em;
    color: $c-accent;
  }

  &__plate-name {
    font-size: clamp(30px, 4vw, 44px);
    font-weight: 250;
    line-height: 1.1;
    margin-top: $sp-1;
  }

  &__plate-desc {
    margin-top: $sp-3;
    font-size: 13px;
  }

  &__reps {
    margin-top: $sp-8;

    > .label {
      margin-bottom: $sp-4;
    }
  }

  &__rep-list {
    display: flex;
    flex-direction: column;
  }

  &__repwrap {
    display: flex;
    align-items: center;
  }

  &__rep {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: $sp-4;
    padding-block: $sp-3;
    border-top: 1px solid $c-line-soft;
    transition: background 0.35s var(--ease-museum);

    &:last-child {
      border-bottom: 1px solid $c-line-soft;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.03);

      .ff__rep-arrow {
        transform: translateX(6px);
        color: $c-text;
      }
    }
  }

  &__rep-year {
    color: $c-text-3;
    width: 52px;
    flex-shrink: 0;
    font-size: 13px;
  }

  &__rep-art {
    width: 30px;
    height: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  &__rep-name {
    font-size: 16px;
    font-weight: 350;
  }

  &__rep-brand {
    font-size: 9px;
  }

  &__rep-arrow {
    margin-left: auto;
    color: $c-text-3;
    transition: transform 0.35s var(--ease-museum), color 0.35s var(--ease-museum);
  }

  &__rep-museum {
    flex-shrink: 0;
    margin-left: $sp-4;
    font-size: 10px;
    color: $c-text-3;
    padding: 6px 12px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    transition: border-color 0.3s var(--ease-museum), color 0.3s var(--ease-museum);

    &:hover {
      color: $c-accent;
      border-color: rgba(184, 178, 164, 0.5);
    }
  }
}
</style>
