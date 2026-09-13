import * as THREE from 'three'

// Shared PBR materials (spec §15): real proportions, restrained gloss,
// no plastic toy feel, no neon.

export function plasticMaterial(color = 0x141414, roughness = 0.5): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0.05,
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
  })
}

export function metalMaterial(color = 0x8f9299, roughness = 0.35): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.9,
  })
}

export function darkGlassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x05070a,
    roughness: 0.2,
    metalness: 0.2,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.4,
  })
}

export function pcbMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x12301f,
    roughness: 0.6,
    metalness: 0.1,
  })
}
