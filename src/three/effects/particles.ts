import * as THREE from 'three'
import { performanceManager } from '../performance/PerformanceManager'

// Ambient dust (spec §81): sparse drifting motes, not stars. Soft round
// sprite generated on a canvas — no texture download.

function makeSoftDotTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class DustField {
  readonly points: THREE.Points
  private texture: THREE.Texture
  private velocities: Float32Array

  constructor(count = performanceManager.profile.particles, spread = 14) {
    this.texture = makeSoftDotTexture()

    const positions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread
      this.velocities[i] = 0.02 + Math.random() * 0.05
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      size: 0.05,
      map: this.texture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    this.points = new THREE.Points(geometry, material)
  }

  update(_dt: number, elapsed: number) {
    this.points.rotation.y = elapsed * 0.008
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute
    // Gentle vertical drift, wrapped in-band — cheap and calm.
    for (let i = 0; i < this.velocities.length; i++) {
      let y = pos.getY(i) + this.velocities[i] * 0.016
      if (y > 4.2) y = -4.2
      pos.setY(i, y)
    }
    pos.needsUpdate = true
  }

  setVisible(v: boolean) {
    this.points.visible = v
  }

  dispose() {
    this.points.geometry.dispose()
    ;(this.points.material as THREE.PointsMaterial).dispose()
    this.texture.dispose()
  }
}
