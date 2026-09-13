import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import {
  plasticMaterial,
  metalMaterial,
  darkGlassMaterial,
} from '../materials/museumMaterials'
import { registerModel } from '../core/ModelLoader'

// ------------------------------------------------------------
// V0.2 展品家族：翻盖 / 直板 / 滑盖 / 全键盘 / 板砖触屏 / 折叠屏。
// 全部为原创程序化模型（无第三方资产）。比例真实、克制的光泽，
// 与主展品 DynaTAC 同一套灯光与材质语言。
// ------------------------------------------------------------

const screenMaterial = () => {
  const m = darkGlassMaterial()
  m.emissive = new THREE.Color(0x0c1216)
  m.emissiveIntensity = 0.5
  return m
}

function addKeys(
  parent: THREE.Object3D,
  rows: number,
  cols: number,
  w: number,
  h: number,
  gapX: number,
  gapY: number,
  y0: number,
  z: number,
  material: THREE.Material,
) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.045, 2, 0.016), material)
      key.position.set((c - (cols - 1) / 2) * gapX, y0 - r * gapY, z)
      key.castShadow = true
      parent.add(key)
    }
  }
}

// ---- 翻盖（StarTAC / RAZR 血统）----
function buildFlip(): THREE.Group {
  const group = new THREE.Group()
  const shell = plasticMaterial(0x17181b, 0.42)
  const trim = plasticMaterial(0x0e0e10, 0.5)
  const key = metalMaterial(0x6f7278, 0.45)
  const glass = screenMaterial()

  // 上盖（微微后仰）
  const upper = new THREE.Group()
  const topSlab = new THREE.Mesh(new RoundedBoxGeometry(0.72, 1.18, 0.09, 3, 0.035), shell)
  topSlab.castShadow = true
  upper.add(topSlab)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.72), glass)
  screen.position.z = 0.047
  upper.add(screen)
  const earpiece = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.015), trim)
  earpiece.position.set(0, 0.5, 0.047)
  upper.add(earpiece)
  upper.position.set(0, 0.68, 0)
  upper.rotation.x = -0.14
  group.add(upper)

  // 铰链
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 20), metalMaterial(0x8a8d92, 0.35))
  hinge.rotation.z = Math.PI / 2
  hinge.position.y = 0.06
  group.add(hinge)

  // 下盖
  const lower = new THREE.Group()
  const bottomSlab = new THREE.Mesh(new RoundedBoxGeometry(0.74, 1.2, 0.13, 3, 0.04), shell)
  bottomSlab.castShadow = true
  lower.add(bottomSlab)
  addKeys(lower, 4, 3, 0.15, 0.1, 0.19, 0.15, 0.3, 0.068, key)
  const micDot = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), trim)
  micDot.rotation.x = Math.PI / 2
  micDot.position.set(0, -0.48, 0.068)
  lower.add(micDot)
  lower.position.set(0, -0.64, 0)
  group.add(lower)

  group.userData.explodeParts = []
  return group
}

// ---- 直板（诺基亚 3210 / 3310 血统）----
function buildBar(): THREE.Group {
  const group = new THREE.Group()
  const shell = plasticMaterial(0x16181a, 0.55)
  const trim = plasticMaterial(0x0c0d0e, 0.5)
  const key = plasticMaterial(0x24272a, 0.6)
  const glass = screenMaterial()

  const body = new THREE.Mesh(new RoundedBoxGeometry(0.82, 2.15, 0.42, 5, 0.12), shell)
  body.castShadow = true
  group.add(body)

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), glass)
  screen.position.set(0, 0.62, 0.212)
  group.add(screen)
  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.02), trim)
  screenFrame.position.set(0, 0.62, 0.202)
  group.add(screenFrame)

  // 导航键 + C 键
  const nav = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.045, 20), key)
  nav.rotation.x = Math.PI / 2
  nav.position.set(0, 0.24, 0.225)
  nav.castShadow = true
  group.add(nav)
  for (const x of [-0.22, 0.22]) {
    const soft = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.08, 0.04, 2, 0.015), key)
    soft.position.set(x, 0.24, 0.22)
    soft.castShadow = true
    group.add(soft)
  }

  // 沿机身微弧排列的 3×4 键盘
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const keyMesh = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.11, 0.05, 2, 0.018), key)
      keyMesh.position.set((c - 1) * 0.2, 0.02 - r * 0.17, 0.21 - r * 0.012)
      keyMesh.rotation.x = -0.08 - r * 0.015
      keyMesh.castShadow = true
      group.add(keyMesh)
    }
  }

  group.userData.explodeParts = []
  return group
}

// ---- 滑盖（N95 / 巧克力血统，呈滑开状态）----
function buildSlider(): THREE.Group {
  const group = new THREE.Group()
  const shell = plasticMaterial(0x141414, 0.45)
  const trim = plasticMaterial(0x0b0b0c, 0.5)
  const key = plasticMaterial(0x1f1f22, 0.55)
  const glass = screenMaterial()

  // 底座（键盘层）
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.84, 1.18, 0.34, 3, 0.06), shell)
  base.castShadow = true
  base.position.set(0, -0.6, 0.06)
  group.add(base)
  addKeys(group, 4, 3, 0.16, 0.1, 0.2, 0.16, -0.28, 0.235, key)
  const dpad = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 20), trim)
  dpad.rotation.x = Math.PI / 2
  dpad.position.set(0, 0.22, 0.24)
  group.add(dpad)

  // 上滑层（屏幕层，向后错开）
  const top = new THREE.Group()
  const slab = new THREE.Mesh(new RoundedBoxGeometry(0.84, 1.34, 0.2, 3, 0.06), shell)
  slab.castShadow = true
  top.add(slab)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.86), glass)
  screen.position.set(0, 0.12, 0.102)
  top.add(screen)
  top.position.set(0, 0.72, -0.1)
  top.rotation.x = 0.06
  group.add(top)

  group.userData.explodeParts = []
  return group
}

// ---- 全键盘（黑莓 Bold 血统）----
function buildQwerty(): THREE.Group {
  const group = new THREE.Group()
  const shell = plasticMaterial(0x141517, 0.5)
  const trim = plasticMaterial(0x0a0a0b, 0.5)
  const key = plasticMaterial(0x232528, 0.55)
  const glass = screenMaterial()

  const body = new THREE.Mesh(new RoundedBoxGeometry(0.88, 2.25, 0.42, 4, 0.09), shell)
  body.castShadow = true
  group.add(body)

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.8), glass)
  screen.position.set(0, 0.6, 0.212)
  group.add(screen)

  // 轨迹球
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 20), metalMaterial(0xb9bcc2, 0.25))
  ball.position.set(0, 0.06, 0.215)
  group.add(ball)

  // QWERTY 5×4 键阵
  for (let r = 0; r < 4; r++) {
    const offset = (r % 2) * 0.05
    for (let c = 0; c < 5; c++) {
      const keyMesh = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.1, 0.05, 2, 0.014), key)
      keyMesh.position.set((c - 2) * 0.148 + offset, -0.22 - r * 0.15, 0.21)
      keyMesh.castShadow = true
      group.add(keyMesh)
    }
  }

  group.userData.explodeParts = []
  return group
}

// ---- 板砖触屏（iPhone 血统）----
function buildSlab(): THREE.Group {
  const group = new THREE.Group()
  const frame = metalMaterial(0x7d8085, 0.4)
  const front = darkGlassMaterial()
  const back = plasticMaterial(0x1c1d1f, 0.35)

  const body = new THREE.Mesh(new RoundedBoxGeometry(1.02, 2.12, 0.1, 4, 0.045), back)
  body.castShadow = true
  group.add(body)

  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 2.06), front)
  face.position.z = 0.052
  group.add(face)

  // 听筒与前置摄像头
  const speaker = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.022, 0.006, 1, 0.003), plasticMaterial(0x0a0a0a, 0.6))
  speaker.position.set(0, 0.92, 0.054)
  group.add(speaker)
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 14), plasticMaterial(0x06070a, 0.4))
  cam.rotation.x = Math.PI / 2
  cam.position.set(-0.18, 0.92, 0.054)
  group.add(cam)

  // Home 键圆环
  const homeRing = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.075, 28), frame)
  homeRing.position.set(0, -0.9, 0.053)
  group.add(homeRing)
  const homeDot = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), plasticMaterial(0x0c0d0e, 0.5))
  homeDot.position.set(0, -0.9, 0.053)
  group.add(homeDot)

  group.userData.explodeParts = []
  return group
}

// ---- 折叠屏（Galaxy Fold 血统，呈展开状态）----
function buildFoldable(): THREE.Group {
  const group = new THREE.Group()
  const shell = plasticMaterial(0x191a1d, 0.4)
  const glass = screenMaterial()
  const metal = metalMaterial(0x888b90, 0.38)

  // 左右两翼，围绕中央铰链微微弯折
  const left = new THREE.Group()
  const leftBody = new THREE.Mesh(new RoundedBoxGeometry(0.78, 2.05, 0.07, 3, 0.03), shell)
  leftBody.castShadow = true
  left.add(leftBody)
  const leftScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.98), glass)
  leftScreen.position.z = 0.037
  left.add(leftScreen)
  left.position.set(-0.385, 0, 0.16)
  left.rotation.y = 0.26
  group.add(left)

  const right = new THREE.Group()
  const rightBody = new THREE.Mesh(new RoundedBoxGeometry(0.78, 2.05, 0.07, 3, 0.03), shell)
  rightBody.castShadow = true
  right.add(rightBody)
  const rightScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.98), glass)
  rightScreen.position.z = 0.037
  right.add(rightScreen)
  right.position.set(0.385, 0, 0.16)
  right.rotation.y = -0.26
  group.add(right)

  // 中央铰链（藏在两翼之后）
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.6, 24), metal)
  hinge.rotation.z = Math.PI / 2
  hinge.position.z = -0.02
  group.add(hinge)

  group.userData.explodeParts = []
  return group
}

registerModel('procedural:flip', buildFlip)
registerModel('procedural:bar', buildBar)
registerModel('procedural:slider', buildSlider)
registerModel('procedural:qwerty', buildQwerty)
registerModel('procedural:slab', buildSlab)
registerModel('procedural:foldable', buildFoldable)
