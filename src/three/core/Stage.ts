import * as THREE from 'three'
import { createRenderer, applyDpr, resizeRenderer } from './Renderer'
import { MuseumScene } from './MuseumScene'
import { performanceManager } from '../performance/PerformanceManager'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// The Stage (spec §50): one persistent canvas + one renderer shared by
// every page. Scenes mount/unmount as the router moves between galleries;
// per-frame 3D state lives here, never in Vue (spec §57).

class StageImpl {
  private renderer: THREE.WebGLRenderer | null = null
  private canvas: HTMLCanvasElement | null = null
  private active: MuseumScene | null = null
  private clock = new THREE.Clock()
  private rafId = 0
  private running = false
  private generation = 0
  private inited = false

  /** Environment map shared by all scenes (PBR reflections, no HDR download). */
  envTexture: THREE.Texture | null = null

  /** Fired whenever a scene finishes mounting (or is cleared with null). */
  onSceneSet: ((scene: MuseumScene | null) => void) | null = null

  get activeScene(): MuseumScene | null {
    return this.active
  }

  get isReady(): boolean {
    return this.active !== null
  }

  init(canvas: HTMLCanvasElement) {
    if (this.inited) return
    this.inited = true
    this.canvas = canvas
    this.renderer = createRenderer(canvas)
    resizeRenderer(this.renderer)

    // Soft studio environment for PBR materials — generated locally.
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const envScene = new RoomEnvironment()
    this.envTexture = pmrem.fromScene(envScene, 0.04).texture
    pmrem.dispose()

    window.addEventListener('resize', this.handleResize, { passive: true })
    window.addEventListener('orientationchange', this.handleResize, { passive: true })
    document.addEventListener('visibilitychange', this.handleVisibility)

    this.running = true
    this.clock.start()
    this.loop()
  }

  /** Mount a scene. Safe to call before init — the request is queued. */
  async setScene(scene: MuseumScene | null) {
    const gen = ++this.generation
    if (this.active === scene) return

    const previous = this.active
    this.active = null
    if (scene) {
      try {
        await scene.build()
      } catch (err) {
        console.error(`[MuseumStage] Failed to build scene "${scene.name}"`, err)
        this.onSceneSet?.(null)
        return
      }
    }
    if (gen !== this.generation) {
      // A newer request superseded this one — discard.
      scene?.dispose()
      return
    }

    if (previous && previous !== scene) {
      previous.dispose()
    }
    this.active = scene

    if (scene) {
      scene.resize(window.innerWidth, window.innerHeight)
      if (this.envTexture) {
        scene.scene.environment = this.envTexture
        // 克制的反射（规范 §15）：柔和光，不刺眼。
        scene.scene.environmentIntensity = 0.35
      }
      this.canvas?.classList.add('stage-canvas--live')
    } else {
      this.canvas?.classList.remove('stage-canvas--live')
    }
    this.onSceneSet?.(scene)
  }

  clearScene() {
    void this.setScene(null)
  }

  /** Re-apply quality settings after a tier change. */
  applyQuality() {
    if (!this.renderer) return
    applyDpr(this.renderer)
    resizeRenderer(this.renderer)
  }

  private handleResize = () => {
    if (!this.renderer) return
    resizeRenderer(this.renderer)
    this.active?.resize(window.innerWidth, window.innerHeight)
  }

  private handleVisibility = () => {
    if (document.hidden) {
      this.running = false
    } else if (this.inited) {
      this.clock.getDelta() // swallow the pause
      this.running = true
    }
  }

  private loop = () => {
    this.rafId = requestAnimationFrame(this.loop)
    if (!this.running || !this.renderer) return

    const dt = Math.min(this.clock.getDelta(), 0.05)
    const elapsed = this.clock.elapsedTime

    if (this.active) {
      this.active.update(dt, elapsed)
      this.renderer.render(this.active.scene, this.active.cameraController.camera)
      performanceManager.sample(dt)
    }
  }
}

export const Stage = new StageImpl()

// Tier changes re-apply DPR/particle budgets at runtime.
performanceManager.onTierChange(() => Stage.applyQuality())
