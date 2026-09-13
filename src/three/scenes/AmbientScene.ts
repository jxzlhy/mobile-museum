import * as THREE from 'three'
import { MuseumScene } from '../core/MuseumScene'
import { DustField } from '../effects/particles'

// Ambient scene: dark space + subtle dust + faint fog. Used by the
// Timeline, Search and Collection galleries so the museum never falls
// back to a flat black page (spec §79).

export class AmbientScene extends MuseumScene {
  readonly name = 'ambient'
  private dust: DustField | null = null

  build() {
    this.scene.fog = new THREE.Fog(0x080808, 10, 24)
    this.dust = new DustField()
    this.scene.add(this.dust.points)
    this.cameraController.setPosition(0, 0, 10)
  }

  update(dt: number, elapsed: number) {
    this.dust?.update(dt, elapsed)
    // Very slow breathing drift
    this.cameraController.camera.position.y = Math.sin(elapsed * 0.12) * 0.25
    this.cameraController.camera.lookAt(0, 0, 0)
  }

  dispose() {
    this.dust?.dispose()
    super.dispose()
  }
}
