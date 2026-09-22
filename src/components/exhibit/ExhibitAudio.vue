<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { AudioGuide } from '@/data/exhibits'

// Audio Guide（V0.5 规范 §16–§18）：
// 只支持预置音频；禁止自动播放；Play / Pause / Seek / Replay；
// preload="none"（点击播放后才加载）；离开展品 pause()。
// 必配 transcript（无声环境 / 无障碍 / 检索）。

const props = defineProps<{ guide: AudioGuide }>()

const audioEl = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const started = ref(false)
const current = ref(0)
const duration = ref(props.guide.duration ?? 0)
const ended = ref(false)

function fmt(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const timeLabel = computed(() => `${fmt(current.value)} / ${fmt(duration.value)}`)
const progressPct = computed(() => (duration.value > 0 ? (current.value / duration.value) * 100 : 0))

async function toggle() {
  const el = audioEl.value
  if (!el) return
  if (playing.value) {
    el.pause()
  } else {
    try {
      await el.play()
    } catch {
      /* 加载失败 → transcript 仍可读（规范 §51） */
    }
  }
}

function replay() {
  const el = audioEl.value
  if (!el) return
  el.currentTime = 0
  void el.play().catch(() => {})
}

function seek(e: Event) {
  const el = audioEl.value
  if (!el || !duration.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = (e as PointerEvent).clientX - rect.left
  el.currentTime = Math.max(0, Math.min(duration.value, (x / rect.width) * duration.value))
}

function onPlay() {
  playing.value = true
  started.value = true
  ended.value = false
}
function onPause() {
  playing.value = false
}
function onEnded() {
  playing.value = false
  ended.value = true
}
function onTime() {
  current.value = audioEl.value?.currentTime ?? 0
}
function onMeta() {
  if (audioEl.value && Number.isFinite(audioEl.value.duration)) {
    duration.value = audioEl.value.duration
  }
}

// 离开展品 / 卸载 → 暂停，不得后台继续播放（§18）
onUnmounted(() => {
  audioEl.value?.pause()
})

watch(
  () => props.guide.id,
  () => {
    audioEl.value?.pause()
    playing.value = false
    started.value = false
    current.value = 0
    ended.value = false
    duration.value = props.guide.duration ?? 0
  },
)
</script>

<template>
  <div class="audio">
    <audio
      ref="audioEl"
      :src="guide.src"
      preload="none"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @timeupdate="onTime"
      @loadedmetadata="onMeta"
    ></audio>

    <div class="audio__controls">
      <button class="audio__btn" :aria-label="playing ? '暂停讲解' : '播放讲解'" @click="toggle">
        {{ playing ? '❚❚' : '▶' }}
      </button>
      <button v-if="ended" class="audio__btn audio__btn--replay" aria-label="重听" @click="replay">↻</button>

      <div
        class="audio__bar"
        role="slider"
        tabindex="0"
        :aria-label="'讲解进度 ' + timeLabel"
        :aria-valuenow="Math.round(progressPct)"
        aria-valuemin="0"
        aria-valuemax="100"
        @click="seek"
      >
        <span class="audio__bar-fill" :style="{ transform: `scaleX(${progressPct / 100})` }"></span>
      </div>
      <p class="mono audio__time">{{ started || ended ? timeLabel : fmt(duration) }}</p>
    </div>

    <details v-if="guide.transcript" class="audio__transcript">
      <summary class="label">TRANSCRIPT · 讲解词</summary>
      <p class="body-md">{{ guide.transcript }}</p>
    </details>
  </div>
</template>

<style lang="scss" scoped>
.audio {
  display: flex;
  flex-direction: column;
  gap: $sp-3;

  &__controls {
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-3 $sp-4;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
  }

  &__btn {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 50%;
    border: 1px solid rgba(184, 178, 164, 0.5);
    color: $c-accent;
    font-size: 13px;
    transition: background 0.3s var(--ease-museum);

    &:hover {
      background: rgba(184, 178, 164, 0.12);
    }

    &--replay {
      width: 32px;
      height: 32px;
      font-size: 12px;
      border-color: $c-line-soft;
      color: $c-text-2;
    }
  }

  &__bar {
    flex: 1;
    height: 20px;
    display: flex;
    align-items: center;
    cursor: pointer;
    border-radius: 999px;

    &::before {
      content: '';
      position: absolute;
    }
  }

  &__bar {
    position: relative;

    &-fill {
      display: block;
      width: 100%;
      height: 3px;
      border-radius: 999px;
      background: $c-accent;
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.2s linear;
    }

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      height: 3px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      z-index: -1;
    }
  }

  &__time {
    font-size: 10px;
    color: $c-text-2;
    flex-shrink: 0;
    min-width: 76px;
    text-align: right;
  }

  &__transcript {
    border-top: 1px solid $c-line-soft;
    padding-top: $sp-3;

    summary {
      cursor: pointer;
      font-size: 9px;
      color: $c-text-3;
      letter-spacing: 0.2em;
    }

    p {
      margin-top: $sp-3;
      color: $c-text-2;
      line-height: 1.9;
    }
  }
}
</style>
