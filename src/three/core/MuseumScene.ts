import * as THREE from 'three'
import { CameraController } from '../camera/CameraController'

// Base class for all museum scenes (spec §49–§50). Owns the scene graph,
// a CameraController, and dispose discipline: everything created through
// track() is released on dispose (spec §91).

export abstract class MuseumScene {
  readonly scene = new THREE.Scene()
  readonly cameraController = new CameraController()

  /** Human-readable name, used by the Stage for debugging. */
  abstract readonly name: string

  private disposables: Array<{ dispose: () => void }> = []

  /** Build the scene graph. May be async (asset loading). */
  abstract build(): Promise<void> | void

  /** Per-frame update. dt in seconds, clamped by the Stage. */
  abstract update(dt: number, elapsed: number): void

  resize(width: number, height: number) {
    this.cameraController.resize(width, height)
  }

  protected track<T extends { dispose: () => void }>(resource: T): T {
    this.disposables.push(resource)
    return resource
  }

  /** Register geometries/materials found on an object tree for disposal. */
  protected trackTree(root: THREE.Object3D) {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) this.disposables.push(mesh.geometry)
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        materials.forEach((m) => {
          const mat = m as THREE.MeshStandardMaterial
          this.disposables.push(mat)
          Object.values(mat).forEach((value) => {
            if (value instanceof THREE.Texture) this.disposables.push(value)
          })
        })
      }
    })
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose())
    this.disposables = []
    this.scene.clear()
  }
}
