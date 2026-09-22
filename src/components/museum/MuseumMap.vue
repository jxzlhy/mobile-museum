<script setup lang="ts">
import { useDevice } from '@/composables/useDevice'

// MuseumMap（规范 §17–§19 / §61）：线框 + 区域标记的博物馆地图，
// 不是 GIS，也不是游戏地图 —— 只强调方向、房间与展品。
// 移动端以 Bottom Sheet 呈现，桌面端为居中浮层。
// 点击区域 → 相机移动到对应展厅。

export interface MapRoom {
  id: string
  zh: string
  en: string
  count: number
  kind: 'zone' | 'treasures' | 'era'
}

const props = defineProps<{
  rooms: MapRoom[]
  eras: MapRoom[]
  currentRoom?: string
}>()

const emit = defineEmits<{
  select: [roomId: string]
  close: []
}>()

const { isDesktop } = useDevice()

function pick(id: string) {
  emit('select', id)
  if (!isDesktop.value) return // 移动端选择后收起面板由父级处理
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="map" role="dialog" aria-modal="true" aria-label="博物馆地图" @keydown="onKeydown">
    <div class="map__backdrop" aria-hidden="true" @click="emit('close')"></div>

    <div class="map__sheet glass-card">
      <header class="map__head">
        <p class="label">MUSEUM MAP · 博物馆地图</p>
        <button class="map__close" aria-label="关闭地图" @click="emit('close')">✕</button>
      </header>

      <!-- 线框平面图：走廊 + 尽端珍藏厅 + 两侧年代耳室 -->
      <div class="map__plan" role="list">
        <p class="map__label label">ENTRANCE · 入口</p>

        <div class="map__corridor">
          <!-- 年代耳室（左列） -->
          <div class="map__wing">
            <button
              v-for="era in eras.filter((_, i) => i % 2 === 0)"
              :key="era.id"
              class="map__room map__room--era"
              :class="{ 'map__room--current': currentRoom === era.id }"
              role="listitem"
              @click="pick(era.id)"
            >
              <span class="map__room-zh">{{ era.zh }}</span>
              <span class="map__room-en mono">{{ era.en }} · {{ era.count }}</span>
            </button>
          </div>

          <!-- 主走廊 -->
          <div class="map__hall">
            <button
              v-for="room in rooms"
              :key="room.id"
              class="map__room map__room--zone"
              :class="{ 'map__room--current': currentRoom === room.id }"
              role="listitem"
              @click="pick(room.id)"
            >
              <span class="map__room-zh">{{ room.zh }}</span>
              <span class="map__room-en mono">{{ room.en }} · {{ room.count }}</span>
            </button>
          </div>

          <!-- 年代耳室（右列） -->
          <div class="map__wing">
            <button
              v-for="era in eras.filter((_, i) => i % 2 === 1)"
              :key="era.id"
              class="map__room map__room--era"
              :class="{ 'map__room--current': currentRoom === era.id }"
              role="listitem"
              @click="pick(era.id)"
            >
              <span class="map__room-zh">{{ era.zh }}</span>
              <span class="map__room-en mono">{{ era.en }} · {{ era.count }}</span>
            </button>
          </div>
        </div>
      </div>

      <p class="map__hint label">选择一个展厅 → 相机带你过去</p>
    </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.map {
  position: fixed;
  inset: 0;
  z-index: 70;

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(4, 4, 4, 0.6);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
  }

  &__sheet {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 22px 22px 0 0;
    background: rgba(12, 12, 12, 0.88);
    padding: $sp-5 $sp-5 $sp-6;
    max-height: 78dvh;
    overflow-y: auto;

    @include desktop {
      left: 50%;
      right: auto;
      top: 50%;
      bottom: auto;
      transform: translate(-50%, -50%);
      width: min(720px, 88vw);
      border-radius: 18px;
    }
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $sp-5;
  }

  &__close {
    width: 34px;
    height: 34px;
    border: 1px solid $c-line-soft;
    border-radius: 50%;
    color: $c-text-2;

    &:hover {
      color: $c-text;
      border-color: $c-line;
    }
  }

  &__label {
    font-size: 9px;
    color: $c-text-3;
    text-align: center;
    margin-bottom: $sp-2;
  }

  &__corridor {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: $sp-3;
    align-items: stretch;
  }

  &__wing {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
    justify-content: space-between;
  }

  &__hall {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
    width: min(240px, 44vw);
    padding: $sp-2;
    border: 1px solid $c-line-soft;
    border-radius: 12px;
    position: relative;

    // 走廊中轴虚线（规范 §18：线框）
    &::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 8px;
      bottom: 8px;
      border-left: 1px dashed rgba(255, 255, 255, 0.14);
      z-index: 0;
    }
  }

  &__room {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: $sp-3 $sp-4;
    border: 1px solid $c-line-soft;
    border-radius: 10px;
    text-align: center;
    transition: border-color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

    &:hover {
      border-color: $c-line;
      background: rgba(255, 255, 255, 0.04);
    }

    &--current {
      border-color: rgba(184, 178, 164, 0.65);

      .map__room-zh {
        color: $c-accent;
      }
    }

    &--era {
      padding: $sp-2 $sp-3;
    }
  }

  &__room-zh {
    font-size: 14px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__room-en {
    font-size: 9px;
    color: $c-text-3;
    letter-spacing: 0.14em;
  }

  &__hint {
    margin-top: $sp-4;
    font-size: 9px;
    color: $c-text-3;
    text-align: center;
  }
}
</style>
