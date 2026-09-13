import * as THREE from 'three'
import { MuseumScene } from '../core/MuseumScene'
import { createMuseumLights, createShadowGround } from '../lights/museumLights'
import { DustField } from '../effects/particles'
import { loadModel } from '../core/ModelLoader'
import type { ExplodePart } from '../models/brickPhone'
import '../models'

// Home scene (spec §13–§14): the hero brick phone alone in dark space,
// soft light, subtle fog, sparse dust. Scroll drives the camera via
// applyScrollState() — the animation layer owns the numbers.

export interface HomeScrollState {
  camX: number
  camY: number
  camZ: number
  lookY: number
  rotY: number
  heroY: number
}

export class HomeScene extends MuseumScene {
  readonly name = 'home'
  private hero: THREE.Group | null = null
  private explodeParts: ExplodePart[] = []
  private dust: DustField | null = null
  private state: HomeScrollState = { camX: 0, camY: 0.55, camZ: 10.6, lookY: 0.35, rotY: -0.55, heroY: 0 }
  private introOffset = { z: 7, y: 0.8 }
  private introPlayed = false

  async build() {
    this.scene.fog = new THREE.Fog(0x080808, 9, 20)

    const lights = createMuseumLights()
    this.scene.add(lights.group)

    const ground = createShadowGround(3.4)
    this.scene.add(ground)

    this.hero = await loadModel('procedural:dynatac')
    this.hero.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) mesh.castShadow = true
    })
    this.scene.add(this.hero)
    this.trackTree(this.hero)
    this.explodeParts = (this.hero.userData.explodeParts as ExplodePart[]) ?? []

    this.dust = new DustField()
    this.scene.add(this.dust.points)

    this.cameraController.setFov(35)
    this.cameraController.setPosition(this.state.camX, this.state.camY, this.state.camZ)
    this.cameraController.lookAt(0, this.state.lookY, 0)
  }

  /** Called by HomeAnimation every scroll frame (plain object, no Vue reactivity). */
  applyScrollState(s: HomeScrollState) {
    this.state = s
  }

  /** Entrance move: the camera glides in when the visitor presses ENTER. */
  enter() {
    if (this.introPlayed) return
    this.introPlayed = true
    import('gsap').then(({ gsap }) => {
      gsap.to(this.introOffset, { z: 0, y: 0, duration: 2.2, ease: 'power3.out' })
    })
  }

  update(dt: number, elapsed: number) {
    this.dust?.update(dt, elapsed)
    if (this.hero) {
      // Scroll pose + a breath of idle life
      this.hero.rotation.y = this.state.rotY + Math.sin(elapsed * 0.3) * 0.03
      this.hero.position.y = this.state.heroY + Math.sin(elapsed * 0.6) * 0.035
    }
    const cam = this.cameraController.camera
    cam.position.set(
      this.state.camX,
      this.state.camY + this.introOffset.y * 0.4,
      this.state.camZ + this.introOffset.z,
    )
    cam.lookAt(0, this.state.lookY, 0)
  }

  dispose() {
    this.dust?.dispose()
    super.dispose()
  }
}
