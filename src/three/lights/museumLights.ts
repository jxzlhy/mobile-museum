import * as THREE from 'three'
import { performanceManager } from '../performance/PerformanceManager'

// Museum lighting rig (spec §14): soft hemispheric base, one warm key,
// one cool rim. Restrained — soft light on dark space, never neon.

export interface MuseumLights {
  group: THREE.Group
  key: THREE.DirectionalLight
  rim: THREE.DirectionalLight
}

export function createMuseumLights(withShadows = true): MuseumLights {
  const group = new THREE.Group()

  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a22, 0.55)
  group.add(hemi)

  const key = new THREE.DirectionalLight(0xfff2e0, 2.2)
  key.position.set(3.5, 5, 3)
  if (withShadows && performanceManager.profile.shadowMapSize > 0) {
    key.castShadow = true
    key.shadow.mapSize.setScalar(performanceManager.profile.shadowMapSize)
    key.shadow.camera.near = 1
    key.shadow.camera.far = 20
    key.shadow.camera.left = -4
    key.shadow.camera.right = 4
    key.shadow.camera.top = 4
    key.shadow.camera.bottom = -4
    key.shadow.bias = -0.0005
    key.shadow.radius = 4
  }
  group.add(key)

  const rim = new THREE.DirectionalLight(0x9db8ff, 1.6)
  rim.position.set(-4, 2.5, -3.5)
  group.add(rim)

  const fill = new THREE.AmbientLight(0xffffff, 0.12)
  group.add(fill)

  return { group, key, rim }
}

/** Shadow-catching ground disc. */
export function createShadowGround(radius = 4): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 48)
  const mat = new THREE.ShadowMaterial({ opacity: 0.35 })
  const ground = new THREE.Mesh(geo, mat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.62
  ground.receiveShadow = true
  return ground
}
