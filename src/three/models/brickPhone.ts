import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import {
  plasticMaterial,
  metalMaterial,
  darkGlassMaterial,
  pcbMaterial,
} from '../materials/museumMaterials'
import { registerModel } from '../core/ModelLoader'

// ------------------------------------------------------------
// Hero exhibit: a simplified, original homage to the 1983 "brick"
// handset (Motorola DynaTAC 8000X). Built procedurally — no third-
// party assets. Parts are registered with base positions and explode
// offsets so the Exploded View (spec §27–§28) can run reversibly.
// ------------------------------------------------------------

export interface ExplodePart {
  name: string
  object: THREE.Object3D
  base: THREE.Vector3
  offset: THREE.Vector3
}

const BODY_W = 0.9
const BODY_H = 2.1
const BODY_D = 0.42

function buildDynaTAC(): THREE.Group {
  const group = new THREE.Group()
  const parts: ExplodePart[] = []

  const body = plasticMaterial(0x161616, 0.52)
  const key = plasticMaterial(0x212121, 0.6)
  const trim = plasticMaterial(0x0d0d0d, 0.45)
  const glass = darkGlassMaterial()
  const metal = metalMaterial(0x9a9da3, 0.3)
  const pcb = pcbMaterial()

  const add = (
    name: string,
    object: THREE.Object3D,
    base: THREE.Vector3,
    offset: THREE.Vector3,
  ) => {
    object.position.copy(base)
    object.name = name
    group.add(object)
    parts.push({ name, object, base: base.clone(), offset })
  }

  // ---- Housing (anchor, never moves) ----
  const housing = new THREE.Mesh(
    new RoundedBoxGeometry(BODY_W, BODY_H, BODY_D, 4, 0.06),
    body,
  )
  housing.castShadow = true
  add('housing', housing, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0))

  // ---- Antenna ----
  const antenna = new THREE.Group()
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.8, 20), body)
  shaft.castShadow = true
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.07, 20), metal)
  tip.position.y = 0.42
  antenna.add(shaft, tip)
  add(
    'antenna',
    antenna,
    new THREE.Vector3(0.27, BODY_H / 2 + 0.32, 0),
    new THREE.Vector3(0, 0.6, 0),
  )

  // ---- Speaker slots ----
  const speaker = new THREE.Group()
  for (let i = 0; i < 4; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.028, 0.02), trim)
    slot.position.y = i * 0.075
    speaker.add(slot)
  }
  add(
    'speaker',
    speaker,
    new THREE.Vector3(0, 0.83, BODY_D / 2 + 0.002),
    new THREE.Vector3(0, 0.12, 0.4),
  )

  // ---- Screen ----
  const screen = new THREE.Group()
  const recess = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.42, 0.03), trim)
  recess.position.z = 0.006
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.34), glass)
  glassPane.position.z = 0.024
  // Faint green segments — a memory, not a neon sign.
  const segments = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x0a1410,
      emissive: 0x1d3a2a,
      emissiveIntensity: 0.9,
      roughness: 0.4,
    }),
  )
  segments.position.z = 0.02
  screen.add(recess, segments, glassPane)
  add(
    'screen',
    screen,
    new THREE.Vector3(0, 0.44, BODY_D / 2 - 0.004),
    new THREE.Vector3(0, 0, 0.6),
  )

  // ---- Keypad ----
  const keypad = new THREE.Group()
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.92, 0.04, 2, 0.02), trim)
  plate.position.z = 0.008
  keypad.add(plate)

  // two wide function keys
  for (const x of [-0.2, 0.2]) {
    const fk = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.11, 0.045, 2, 0.018), key)
    fk.position.set(x, 0.28, 0.032)
    fk.castShadow = true
    keypad.add(fk)
  }
  // 3 × 4 numeric grid
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const k = new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.13, 0.05, 2, 0.02), key)
      k.position.set((col - 1) * 0.235, 0.08 - row * 0.185, 0.034)
      k.castShadow = true
      keypad.add(k)
    }
  }
  add(
    'keypad',
    keypad,
    new THREE.Vector3(0, -0.52, BODY_D / 2 - 0.004),
    new THREE.Vector3(0, 0, 0.42),
  )

  // ---- Side buttons ----
  const sideButtons = new THREE.Group()
  for (const y of [0.18, -0.08]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.14, 0.16, 2, 0.02), body)
    b.position.y = y
    sideButtons.add(b)
  }
  add(
    'sideButtons',
    sideButtons,
    new THREE.Vector3(-BODY_W / 2 - 0.022, 0, 0),
    new THREE.Vector3(-0.35, 0, 0),
  )

  // ---- Internal PCB (visible when exploded) ----
  const pcbGroup = new THREE.Group()
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.15, 0.05), pcb)
  board.castShadow = true
  pcbGroup.add(board)
  const chipMat = plasticMaterial(0x0a0a0a, 0.4)
  for (const [x, y] of [
    [-0.15, 0.32],
    [0.16, 0.1],
    [-0.05, -0.22],
  ]) {
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.03), chipMat)
    chip.position.set(x, y, 0.04)
    pcbGroup.add(chip)
  }
  add('pcb', pcbGroup, new THREE.Vector3(0, 0.28, -0.04), new THREE.Vector3(0, 0.05, 0.14))

  // ---- Battery ----
  const battery = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.78, 0.1, 2, 0.03), plasticMaterial(0x232323, 0.55))
  battery.castShadow = true
  add('battery', battery, new THREE.Vector3(0, -0.5, -0.06), new THREE.Vector3(0, -0.1, -0.2))

  // ---- Back cover ----
  const backCover = new THREE.Mesh(
    new RoundedBoxGeometry(BODY_W - 0.05, BODY_H - 0.08, 0.06, 3, 0.05),
    plasticMaterial(0x1b1b1b, 0.6),
  )
  backCover.castShadow = true
  add('backCover', backCover, new THREE.Vector3(0, 0, -BODY_D / 2 + 0.015), new THREE.Vector3(0, 0, -0.75))

  // Expose explode metadata for scenes (spec §27).
  group.userData.explodeParts = parts
  group.userData.explodeLabels = [
    { part: 'antenna', label: '天线', description: '一根四分之一波长的鞭状天线——1983 年的信号代价。' },
    { part: 'speaker', label: '听筒', description: '显示屏上方的发声孔。' },
    { part: 'screen', label: 'LED 显示屏', description: '一段红色段码屏：只显示数字，别无他物。' },
    { part: 'keypad', label: '键盘', description: '十二颗机械按键，只能存十个号码。' },
    { part: 'pcb', label: '主板', description: '分立元件承担着今天一整片晶圆的工作。' },
    { part: 'battery', label: '电池', description: '镍镉电池：充电十小时，通话三十分钟。' },
    { part: 'backCover', label: '后盖', description: '让它成为"砖头"的那块外壳。' },
  ]

  return group
}

registerModel('procedural:dynatac', buildDynaTAC)
