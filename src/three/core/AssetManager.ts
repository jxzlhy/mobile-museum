import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Asset management (spec §52–§53): one cache, one loading pipeline,
// explicit dispose. Procedural models are registered separately in
// models/registry.ts; this manager owns network assets (GLB/textures)
// which V0.1 barely uses but the architecture requires.

interface CacheEntry {
  object: unknown
  refs: number
}

class AssetManagerImpl {
  private cache = new Map<string, CacheEntry>()
  private loadingManager = new THREE.LoadingManager()
  private gltfLoader: GLTFLoader
  private textureLoader: THREE.TextureLoader

  onProgress: ((url: string, loaded: number, total: number) => void) | null = null

  constructor() {
    this.loadingManager.onProgress = (url, loaded, total) => {
      this.onProgress?.(url, loaded, total)
    }
    this.gltfLoader = new GLTFLoader(this.loadingManager)
    this.textureLoader = new THREE.TextureLoader(this.loadingManager)
  }

  async loadGLB(url: string): Promise<THREE.Group> {
    const cached = this.cache.get(url)
    if (cached) {
      cached.refs += 1
      return cached.object as THREE.Group
    }
    const gltf = await this.gltfLoader.loadAsync(url)
    const group = gltf.scene
    this.cache.set(url, { object: group, refs: 1 })
    return group
  }

  async loadTexture(url: string): Promise<THREE.Texture> {
    const cached = this.cache.get(url)
    if (cached) {
      cached.refs += 1
      return cached.object as THREE.Texture
    }
    const texture = await this.textureLoader.loadAsync(url)
    texture.colorSpace = THREE.SRGBColorSpace
    this.cache.set(url, { object: texture, refs: 1 })
    return texture
  }

  release(url: string) {
    const entry = this.cache.get(url)
    if (!entry) return
    entry.refs -= 1
    if (entry.refs <= 0) {
      this.cache.delete(url)
      const obj = entry.object as { dispose?: () => void }
      obj.dispose?.()
    }
  }

  dispose() {
    this.cache.forEach((entry) => {
      const obj = entry.object as { dispose?: () => void }
      obj.dispose?.()
    })
    this.cache.clear()
  }
}

export const assetManager = new AssetManagerImpl()
