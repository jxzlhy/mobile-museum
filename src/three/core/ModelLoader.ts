import * as THREE from 'three'
import { assetManager } from './AssetManager'

// Unified model entry point (spec §52). `model` ids beginning with
// "procedural:" are built in code; anything else is treated as a GLB url.

export type ModelBuilder = () => THREE.Group

const proceduralBuilders = new Map<string, ModelBuilder>()

export function registerModel(id: string, builder: ModelBuilder) {
  proceduralBuilders.set(id, builder)
}

export function hasModel(id: string): boolean {
  return id.startsWith('procedural:')
    ? proceduralBuilders.has(id)
    : true // assume GLB exists; loadGLB will fail gracefully
}

export async function loadModel(id: string): Promise<THREE.Group> {
  if (id.startsWith('procedural:')) {
    const builder = proceduralBuilders.get(id)
    if (!builder) throw new Error(`Unknown procedural model: ${id}`)
    return builder()
  }
  return assetManager.loadGLB(id)
}
