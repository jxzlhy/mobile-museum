import * as THREE from 'three'
import { performanceManager } from '../performance/PerformanceManager'

// Single renderer factory (spec §50). Tone mapping and color space are
// fixed museum-wide so every scene shares one visual response to light.

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: performanceManager.profile.antialias,
    powerPreference: 'high-performance',
  })

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = performanceManager.profile.shadowMapSize > 0
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  applyDpr(renderer)
  return renderer
}

export function applyDpr(renderer: THREE.WebGLRenderer) {
  const dpr = Math.min(window.devicePixelRatio || 1, performanceManager.profile.dprCap)
  renderer.setPixelRatio(dpr)
}

export function resizeRenderer(renderer: THREE.WebGLRenderer) {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h, false)
}
