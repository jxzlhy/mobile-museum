import { reactive } from 'vue'
import type { MotionMode } from '@/data/types'

// Global museum state shared across views and the shell.
// Only discrete, user-facing state lives here — never per-frame 3D data (spec §57).

interface MuseumState {
  /** 0 → 1 preloader progress */
  progress: number
  /** preloader finished revealing the entrance */
  ready: boolean
  /** visitor has pressed ENTER MUSEUM */
  entered: boolean
  /** WebGL availability */
  webgl: boolean
  motionMode: MotionMode
}

const state = reactive<MuseumState>({
  progress: 0,
  ready: false,
  entered: false,
  webgl: true,
  motionMode: 'standard',
})

export function useMuseum() {
  return {
    state,
    setProgress(v: number) {
      state.progress = Math.max(state.progress, Math.min(1, Math.max(0, v)))
    },
    setReady(v: boolean) {
      state.ready = v
    },
    enter() {
      state.entered = true
    },
    setWebgl(v: boolean) {
      state.webgl = v
    },
    setMotionMode(m: MotionMode) {
      state.motionMode = m
    },
  }
}
