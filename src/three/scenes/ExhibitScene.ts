import * as THREE from 'three'
import { MuseumScene } from '../core/MuseumScene'
import { createMuseumLights, createShadowGround } from '../lights/museumLights'
import { loadModel } from '../core/ModelLoader'
import { DustField } from '../effects/particles'
import type { ExplodePart } from '../models/brickPhone'
import { ExhibitCameraController, type ExhibitNodePose } from '../camera/ExhibitCameraController'
import '../models'

// ============================================================
// ExhibitScene（V0.5 规范 §6 / §8–§11 / §35–§36 / §50）：
// 单件展品的深度观察场景。拖拽旋转（带惯性）、缩放、复位；
// 结构拆解 0→1 完全可逆；部件聚焦 + 克制的高亮（soft emissive，
// 禁止霓虹）。离开展页由 view 层负责 dispose（§50）。
// ============================================================

const ACCENT = new THREE.Color(0xb8b2a4)

export class ExhibitScene extends MuseumScene {
  readonly name = 'exhibit'
  readonly exhibitCamera: ExhibitCameraController

  private modelId: string
  private reduced: boolean
  private model: THREE.Group | null = null
  private explodeParts: ExplodePart[] = []
  private partGroups = new Map<string, THREE.Object3D>()
  private dust: DustField | null = null

  // 旋转状态（规范 §6：不允许无限自转；Auto Rotate 默认关闭）
  private spinVel = 0
  private spinPos = 0
  private dragging = false
  private autoRotate = false
  private focused = false
  private explodeT = 0

  // 高亮状态（§36：soft emissive）
  private highlightedNodes = new Set<string>()
  private savedEmissive = new Map<THREE.MeshStandardMaterial, { color: THREE.Color; intensity: number }>()

  // 缩放（wheel / pinch）
  private zoomTarget = 0
  private baseCamZ = 5.4

  constructor(modelId: string, opts: { reduced?: boolean } = {}) {
    super()
    this.modelId = modelId
    this.reduced = Boolean(opts.reduced)
    this.exhibitCamera = new ExhibitCameraController(this.cameraController.camera)
  }

  /** 运行时更新 reduced motion 偏好（§47）。 */
  setReduced(v: boolean) {
    this.reduced = v
  }

  async build() {
    this.scene.fog = new THREE.Fog(0x080808, 10, 22)

    const lights = createMuseumLights()
    this.scene.add(lights.group)

    // 展柜正面补光：深色展品在黑空间里必须可读（规范 §37 Soft Light）
    const fill = new THREE.DirectionalLight(0xfff6e8, 2.6)
    fill.position.set(0.8, 1.8, 4.5)
    this.scene.add(fill)
    const fillLeft = new THREE.DirectionalLight(0xe8ecff, 1.2)
    fillLeft.position.set(-3, 0.5, 2.5)
    this.scene.add(fillLeft)
    const bounce = new THREE.DirectionalLight(0xffffff, 0.6)
    bounce.position.set(0, -2, 3)
    this.scene.add(bounce)
    // Stage 会在 setScene 时覆盖 environmentIntensity —— 每帧恢复展柜级设置
    this.scene.environmentIntensity = 1.4

    this.scene.add(createShadowGround(3))

    this.model = await loadModel(this.modelId)
    this.model.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        // 材质按部件克隆，高亮互不影响（§36）；单材质保持单材质（数组材质
        // 需要几何体 groups 支持，否则无法正常渲染）
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => {
            const clone = (m as THREE.MeshStandardMaterial).clone()
            this.track(clone)
            return clone
          })
        } else if (mesh.material) {
          const clone = (mesh.material as THREE.MeshStandardMaterial).clone()
          this.track(clone)
          mesh.material = clone
        }
      }
    })

    // 归一化：2.4 单位高，居中
    const box = new THREE.Box3().setFromObject(this.model)
    const size = box.getSize(new THREE.Vector3())
    const scale = 2.4 / Math.max(size.y, 0.001)
    this.model.scale.setScalar(scale)
    const center = new THREE.Box3().setFromObject(this.model).getCenter(new THREE.Vector3())
    this.model.position.sub(center)
    this.scene.add(this.model)
    this.trackTree(this.model)

    this.explodeParts = (this.model.userData.explodeParts as ExplodePart[]) ?? []
    // 结构部件注册（锚点在爆炸前的原始世界位）
    for (const part of this.explodeParts) {
      if (part.name === 'housing' || part.name === 'chassis') continue // 锚点不单独聚焦
      this.partGroups.set(part.name, part.object)
    }

    this.dust = new DustField()
    this.scene.add(this.dust.points)

    this.cameraController.setFov(35)
    this.resize(window.innerWidth, window.innerHeight)
    this.exhibitCamera.setDefaultPose({
      pos: new THREE.Vector3(0, 0.1, this.baseCamZ),
      look: new THREE.Vector3(0, 0, 0),
    })
    this.exhibitCamera.setImmediate({
      pos: new THREE.Vector3(0, 0.1, this.baseCamZ),
      look: new THREE.Vector3(0, 0, 0),
    })
  }

  /** 窄视口拉远（与 PhoneScene 同一响应式规则）。 */
  resize(width: number, height: number) {
    super.resize(width, height)
    const aspect = width / Math.max(height, 1)
    this.baseCamZ = aspect < 0.75 ? 8 : aspect < 1.1 ? 6.6 : 5.6
    if (!this.focused) {
      this.cameraController.setPosition(0, 0.1, this.baseCamZ)
      this.cameraController.lookAt(0, 0, 0)
    }
  }

  // ------------------------------------------------------------
  // 部件位姿（§35：focusPart / focusMaterial / focusDetail）
  // ------------------------------------------------------------

  /** 为节点注册相机位（部件中心稍退后；拆解状态下按当前位姿计算）。 */
  registerNodePose(id: string, nodeName: string) {
    const obj = this.partGroups.get(nodeName) ?? this.partGroups.get(id)
    if (!obj) return false
    obj.updateWorldMatrix(true, true)
    const look = new THREE.Vector3()
    new THREE.Box3().setFromObject(obj).getCenter(look)
    const center = new THREE.Vector3(0, 0, 0)
    const dir = look.clone().sub(center)
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1)
    dir.normalize()
    // 拆解后部件沿 z 散开，距离必须足够远才不会被中间部件挡住
    const pos = look.clone().addScaledVector(dir, 4.2).add(new THREE.Vector3(0, 0.35, 0))
    this.exhibitCamera.registerNode(id, { pos, look } satisfies ExhibitNodePose)
    return true
  }

  get hasStructure(): boolean {
    return this.explodeParts.length > 0
  }

  /** 可聚焦的部件节点名（与策展数据的 modelNode 对应）。 */
  get nodeNames(): string[] {
    return [...this.partGroups.keys()]
  }

  // ------------------------------------------------------------
  // 交互（§6 / §9 / §44 / §45）
  // ------------------------------------------------------------

  dragBy(dxPixels: number) {
    this.dragging = true
    this.focused = false
    const delta = dxPixels * 0.0085
    this.spinPos += delta
    this.spinVel = delta
    this.exhibitCamera.cancel()
  }

  endDrag() {
    this.dragging = false
  }

  /** Auto Rotate 默认关闭（§6）；开启也只是极缓的展示旋转。 */
  setAutoRotate(on: boolean) {
    this.autoRotate = on
  }

  /** wheel / pinch 缩放（正向拉近）。 */
  zoomBy(delta: number) {
    this.zoomTarget = THREE.MathUtils.clamp(this.zoomTarget + delta, -2.6, 2.8)
    this.exhibitCamera.cancel()
  }

  /** 拆解 0→1（§9：完全可逆；reduced motion 直接到位，§47）。 */
  setExplode(t: number) {
    this.explodeT = THREE.MathUtils.clamp(t, 0, 1)
    const e = this.reduced ? this.explodeT : THREE.MathUtils.smoothstep(this.explodeT, 0, 1)
    for (const part of this.explodeParts) {
      part.object.position.copy(part.base).addScaledVector(part.offset, e)
    }
  }

  get explodeProgress() {
    return this.explodeT
  }

  // ------------------------------------------------------------
  // 高亮与聚焦（§36）
  // ------------------------------------------------------------

  clearHighlight() {
    for (const mat of this.savedEmissive.keys()) {
      const saved = this.savedEmissive.get(mat)
      if (saved) {
        mat.emissive.copy(saved.color)
        mat.emissiveIntensity = saved.intensity
      }
    }
    this.savedEmissive.clear()
    this.highlightedNodes.clear()
  }

  highlightNode(nodeName: string) {
    const obj = this.partGroups.get(nodeName)
    if (!obj) return
    if (this.highlightedNodes.has(nodeName)) return
    this.highlightedNodes.add(nodeName)
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial
        if (!std.emissive) continue
        if (!this.savedEmissive.has(std)) {
          this.savedEmissive.set(std, { color: std.emissive.clone(), intensity: std.emissiveIntensity })
        }
        std.emissive.copy(ACCENT)
        std.emissiveIntensity = 0.22
      }
    })
  }

  /** 聚焦部件：高亮 + 相机（§35 / §36）。位姿按当前拆解状态实时计算。 */
  async focusNode(id: string, nodeName?: string): Promise<boolean> {
    const node = nodeName ?? id
    if (!this.partGroups.has(node)) return false
    this.registerNodePose(node, node)
    this.clearHighlight()
    this.highlightNode(node)
    this.focused = true
    await this.exhibitCamera.focusNode(node, this.reduced)
    return true
  }

  /** 回到整机位（§35 reset）。 */
  async resetView() {
    this.clearHighlight()
    this.focused = false
    this.zoomTarget = 0
    await this.exhibitCamera.reset(this.reduced)
  }

  /** 结构模式的展示机位：转到 3/4 视角，让前后方向的拆解看得见分离。 */
  presentStructure() {
    this.focused = false
    this.exhibitCamera.cancel()
    void import('gsap').then(({ gsap }) => {
      gsap.to(this, {
        spinPos: 0.8,
        duration: this.reduced ? 0.01 : 0.8,
        ease: 'power2.inOut',
      })
    })
  }

  // ------------------------------------------------------------
  // 拾取（§11：点击部件）
  // ------------------------------------------------------------

  private raycaster = new THREE.Raycaster()

  pick(ndcX: number, ndcY: number): string | null {
    if (!this.model) return null
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.cameraController.camera)
    const hits = this.raycaster.intersectObject(this.model, true)
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object
      while (obj) {
        if (obj.name && this.partGroups.has(obj.name)) return obj.name
        obj = obj.parent
      }
    }
    return null
  }

  update(dt: number, elapsed: number) {
    // Stage 会在 setScene 时写入 environmentIntensity = 0.35 —— 展品页保持更高
    if (this.scene.environmentIntensity < 1.2) this.scene.environmentIntensity = 1.4
    this.dust?.update(dt, elapsed)

    if (!this.dragging) {
      if (this.autoRotate && !this.focused) this.spinPos += dt * 0.25
      this.spinPos += this.spinVel
      this.spinVel *= Math.pow(0.92, dt * 60)
    }

    if (this.model && !this.focused) {
      this.model.rotation.y = this.spinPos
      this.model.position.y = Math.sin(elapsed * 0.6) * 0.03
    }

    // 缩放阻尼
    if (Math.abs(this.zoomTarget) > 0.001 && !this.focused) {
      const cam = this.cameraController.camera
      const current = cam.position.z
      const target = this.baseCamZ - this.zoomTarget
      cam.position.z += (target - current) * Math.min(1, dt * 8)
    }

    this.exhibitCamera.update(dt)
  }

  dispose() {
    this.dust?.dispose()
    this.clearHighlight()
    super.dispose()
  }
}
