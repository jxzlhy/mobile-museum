import * as THREE from 'three'
import { MuseumScene } from '../core/MuseumScene'
import { createMuseumLights, createShadowGround } from '../lights/museumLights'
import { DustField } from '../effects/particles'
import { loadModel } from '../core/ModelLoader'
import type { ExplodePart } from '../models/brickPhone'
import '../models'

// Phone exhibit scene (spec §26–§28): drag-to-rotate with inertia,
// reversible exploded view driven by a 0→1 value. Built from the
// phone's `model` id; failures are handled by the view (fallback plate).

export class PhoneScene extends MuseumScene {
  readonly name = 'phone'
  private model: THREE.Group | null = null
  private explodeParts: ExplodePart[] = []
  private dust: DustField | null = null

  // Spin state — inertia is mandatory (spec §26): velocity decays, never stops dead.
  private spinVel = 0
  private spinPos = 0
  private dragging = false

  private explodeT = 0

  constructor(private modelId: string) {
    super()
  }

  async build() {
    this.scene.fog = new THREE.Fog(0x080808, 10, 22)

    const lights = createMuseumLights()
    this.scene.add(lights.group)

    const ground = createShadowGround(3)
    this.scene.add(ground)

    this.model = await loadModel(this.modelId)
    this.model.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) mesh.castShadow = true
    })

    // Normalize: fit the model to a 2.6-unit height, center it.
    const box = new THREE.Box3().setFromObject(this.model)
    const size = box.getSize(new THREE.Vector3())
    const scale = 2.6 / Math.max(size.y, 0.001)
    this.model.scale.setScalar(scale)
    const recenter = new THREE.Box3().setFromObject(this.model)
    const center = recenter.getCenter(new THREE.Vector3())
    this.model.position.sub(center)

    this.scene.add(this.model)
    this.trackTree(this.model)
    this.explodeParts = (this.model.userData.explodeParts as ExplodePart[]) ?? []

    this.dust = new DustField()
    this.scene.add(this.dust.points)

    this.cameraController.setFov(35)
    this.resize(window.innerWidth, window.innerHeight)
  }

  /** Narrow viewports need the camera further back and the exhibit framed high. */
  resize(width: number, height: number) {
    super.resize(width, height)
    const aspect = width / Math.max(height, 1)
    const narrow = aspect < 0.75
    const z = narrow ? 8 : aspect < 1.1 ? 6.4 : 5.4
    this.cameraController.setPosition(0, 0.1, z)
    // On narrow screens the exhibit rides above the text block.
    this.cameraController.lookAt(0, narrow ? -0.55 : 0, 0)
  }

  /** Feed a horizontal drag delta (px) from the view layer. */
  dragBy(dxPixels: number) {
    this.dragging = true
    const delta = dxPixels * 0.0085
    this.spinPos += delta
    this.spinVel = delta
  }

  endDrag() {
    this.dragging = false
  }

  /** Exploded view 0→1, scrub-reversible (spec §28). */
  setExplode(t: number) {
    this.explodeT = THREE.MathUtils.clamp(t, 0, 1)
    const e = THREE.MathUtils.smoothstep(this.explodeT, 0, 1)
    for (const part of this.explodeParts) {
      part.object.position.copy(part.base).addScaledVector(part.offset, e)
    }
  }

  get explodeProgress() {
    return this.explodeT
  }

  /** Level-3 capability flag: only models with registered parts can explode. */
  get hasExplode() {
    return this.explodeParts.length > 0
  }

  update(dt: number, elapsed: number) {
    this.dust?.update(dt, elapsed)

    if (!this.dragging) {
      this.spinPos += this.spinVel
      this.spinVel *= Math.pow(0.92, dt * 60) // frame-rate independent damping
    }

    if (this.model) {
      this.model.rotation.y = this.spinPos + Math.sin(elapsed * 0.4) * 0.02
      this.model.position.y = Math.sin(elapsed * 0.7) * 0.04
    }
  }

  dispose() {
    this.dust?.dispose()
    super.dispose()
  }
}
