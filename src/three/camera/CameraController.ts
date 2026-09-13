import * as THREE from 'three'

// Camera control (spec §51). GSAP can tween any of the exported props;
// scenes apply them each frame. Scroll-driven motion is expressed by
// the animation layer writing plain values here — never Vue state.

export class CameraController {
  readonly camera: THREE.PerspectiveCamera

  constructor(fov = 35, near = 0.1, far = 60) {
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far)
    this.camera.position.set(0, 0, 8)
  }

  /** Called by the Stage on resize. */
  resize(width: number, height: number) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  setPosition(x: number, y: number, z: number) {
    this.camera.position.set(x, y, z)
  }

  lookAt(x: number, y: number, z: number) {
    this.camera.lookAt(x, y, z)
  }

  /** Smoothly move the camera to a position (Vue intent → controller). */
  moveTo(x: number, y: number, z: number, duration = 1.2) {
    const target = { x, y, z }
    const start = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    }
    const obj = { ...start }
    // Local dynamic import of gsap would break the decoupling less than
    // a circular import; gsap is already a core dependency.
    return import('gsap').then(({ gsap }) =>
      gsap.to(obj, {
        ...target,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => this.setPosition(obj.x, obj.y, obj.z),
      }),
    )
  }

  setFov(fov: number) {
    this.camera.fov = fov
    this.camera.updateProjectionMatrix()
  }
}
