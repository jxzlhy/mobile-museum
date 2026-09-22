import * as THREE from 'three'
import { MuseumScene } from '../core/MuseumScene'
import { createMuseumLights } from '../lights/museumLights'
import { loadModel } from '../core/ModelLoader'
import { DustField } from '../effects/particles'
import { performanceManager } from '../performance/PerformanceManager'
import { assetSrc, resolvePhoneImage } from '@/data/assets'
import type { Phone } from '@/data/types'
import type { MuseumRoom } from '@/services/museumService'
import {
  MuseumCameraController,
  makePose,
  lerpPose,
  type CameraPose,
} from '../camera/MuseumCameraController'
import '../models'

// ============================================================
// MuseumHallScene（规范 §5–§9 / §32 / §49）：三维主展厅。
// 空间即展厅：入口 → 主厅 → 走廊两侧的历史/设计/技术/形态展区 →
// 尽端的珍藏厅；年代展厅是走廊旁的耳室。展品 = 展座 + 实拍图版 /
// 程序化 3D / 线稿替代 + 展签（规范 §13–§15）。不做完整建筑（规范 §32）：
// Spatial Composition + Light + Fog + Objects。
// ============================================================

export interface HallZone {
  room: MuseumRoom
  phones: Phone[]
}

export interface HallPlan {
  /** 走廊展区（按动线顺序）。 */
  zones: HallZone[]
  /** 年代耳室。 */
  eras: HallZone[]
  /** prefers-reduced-motion：相机位移走最短路径（规范 §57）。 */
  reduced: boolean
}

export interface HallExhibitAnchor {
  phoneId: string
  roomId: string
  isTreasure: boolean
  /** 展品内容中心（注视点）。 */
  lookPos: THREE.Vector3
  /** 观看位（相机停靠点）。 */
  viewPos: THREE.Vector3
  object: THREE.Group
}

const ZONE_GAP = 15
const ENTRANCE_Z = 12
const FOG_NEAR = 12
const FOG_FAR = 30

/** 展品可见预算（规范 §53）：Mobile 1–3，Desktop 3–8 → 低配再收紧。 */
function visibleBudget(): number {
  const tier = performanceManager.currentTier
  if (performanceManager.isMobile) return tier === 'low' ? 3 : 4
  return tier === 'low' ? 5 : tier === 'medium' ? 7 : 10
}

function makePlaqueTexture(no: string | undefined, name: string, year: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 176
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.textAlign = 'center'
  if (no) {
    ctx.fillStyle = 'rgba(184, 178, 164, 0.95)'
    ctx.font = '500 26px "SF Mono", ui-monospace, monospace'
    ctx.fillText(no.toUpperCase(), canvas.width / 2, 44)
  }
  ctx.fillStyle = 'rgba(245, 245, 245, 0.96)'
  ctx.font = '350 46px "Inter", "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText(name, canvas.width / 2, 104, canvas.width - 40)
  ctx.fillStyle = 'rgba(160, 160, 160, 0.85)'
  ctx.font = '400 30px "SF Mono", ui-monospace, monospace'
  ctx.fillText(String(year), canvas.width / 2, 152)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 2
  return tex
}

export class MuseumHallScene extends MuseumScene {
  readonly name = 'museum-hall'
  /** 展厅专用相机（规范 §11）。 */
  readonly hallCamera: MuseumCameraController

  private plan: HallPlan
  private anchors = new Map<string, HallExhibitAnchor>()
  private zoneGroups = new Map<string, { group: THREE.Group; center: THREE.Vector3 }>()
  /** 滚动动线位姿（入口 → 主厅 → 走廊展区），仅供滚动映射。 */
  private poses: CameraPose[] = []
  /** 年代耳室位姿（由 enterRoom 飞行进入，不参与滚动映射）。 */
  private eraPoses = new Map<string, CameraPose>()
  private poseIndex = new Map<string, number>()
  private dust: DustField | null = null
  private raycaster = new THREE.Raycaster()
  private highlighted: HallExhibitAnchor | null = null
  private scrollT = 0
  private scratchPose: CameraPose = { pos: new THREE.Vector3(), look: new THREE.Vector3() }
  private cameraDelta = new THREE.Vector3()

  constructor(plan: HallPlan) {
    super()
    this.plan = plan
    this.hallCamera = new MuseumCameraController(this.cameraController.camera)
  }

  /** 展品锚点（聚焦 / 拾取用）。 */
  getAnchor(phoneId: string): HallExhibitAnchor | undefined {
    return this.anchors.get(phoneId)
  }

  /** 某展品所在展区 id。 */
  roomOf(phoneId: string): string | undefined {
    return this.anchors.get(phoneId)?.roomId
  }

  /** 运行时更新 reduced motion 偏好（规范 §57）。 */
  setReduced(v: boolean) {
    this.plan.reduced = v
  }

  async build() {
    this.scene.fog = new THREE.Fog(0x080808, FOG_NEAR, FOG_FAR)

    const lights = createMuseumLights(false)
    this.scene.add(lights.group)

    // ---- 地面与浅网格：空间感的最小要素（规范 §32）----
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(140, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.95, metalness: 0 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.02
    floor.receiveShadow = true
    this.scene.add(floor)
    this.track(floor.geometry)
    this.track(floor.material as THREE.Material)

    const grid = new THREE.GridHelper(180, 90, 0x242424, 0x161616)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.35
    grid.position.y = 0
    this.scene.add(grid)

    // ---- 走廊展区 ----
    const zonePoses: CameraPose[] = []
    this.plan.zones.forEach((zone, i) => {
      const z = -(i + 1) * ZONE_GAP
      this.buildZone(zone, new THREE.Vector3(0, 0, z), i === 0)
      zonePoses.push(makePose(0, 2.0, z + 7.5, 0, 1.05, z - 4))
      this.poseIndex.set(zone.room.id, 2 + i) // 0 = 入口，1 = 主厅
    })
    this.poses = [
      makePose(0, 2.5, ENTRANCE_Z + 2.5, 0, 1.3, 2), // 0 — 入口
      makePose(0, 2.2, 5.5, 0, 1.2, -4), // 1 — 主厅
      ...zonePoses,
    ]

    // ---- 年代耳室（走廊两侧，规范 §30）----
    this.plan.eras.forEach((era, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const z = -6 - Math.floor(i / 2) * ZONE_GAP
      const center = new THREE.Vector3(side * 13, 0, z - 2)
      this.buildEraRoom(era, center)
      // 耳室相机位：站在圆阵入口，看向圆心
      this.eraPoses.set(
        era.room.id,
        makePose(center.x, 2.1, center.z + 5.6, center.x, 1.0, center.z - 1.5),
      )
    })

    this.dust = new DustField()
    this.scene.add(this.dust.points)

    this.cameraController.setFov(42)
    this.resize(window.innerWidth, window.innerHeight)
  }

  /** 窄视口拉远相机，保证两侧展品都进画面。 */
  resize(width: number, height: number) {
    super.resize(width, height)
    const aspect = width / Math.max(height, 1)
    this.cameraController.setFov(aspect < 0.8 ? 52 : aspect < 1.2 ? 46 : 42)
  }

  // ------------------------------------------------------------
  // 空间构建
  // ------------------------------------------------------------

  private buildZone(zone: HallZone, center: THREE.Vector3, isFirst: boolean) {
    const group = new THREE.Group()

    // 展区门框：两柱一梁（不做墙，规范 §32）
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6, metalness: 0.4 })
    const pillarGeo = new THREE.BoxGeometry(0.28, 3.6, 0.28)
    for (const x of [-2.8, 2.8]) {
      const pillar = new THREE.Mesh(pillarGeo, frameMat)
      pillar.position.set(center.x + x, 1.8, center.z + 6.4)
      group.add(pillar)
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.28, 0.28), frameMat)
    lintel.position.set(center.x, 3.6, center.z + 6.4)
    group.add(lintel)
    this.track(frameMat)
    this.track(pillarGeo)

    // 展区补光：柔和的点光悬在展区中心上方
    const zoneLight = new THREE.PointLight(0xfff2e0, 26, 16, 1.8)
    zoneLight.position.set(center.x, 3.4, center.z)
    group.add(zoneLight)

    this.placeExhibits(zone, group, center, isFirst)
    this.scene.add(group)
    this.zoneGroups.set(zone.room.id, { group, center: center.clone() })
  }

  private buildEraRoom(era: HallZone, center: THREE.Vector3) {
    const group = new THREE.Group()

    const zoneLight = new THREE.PointLight(0x9db8ff, 20, 14, 1.8)
    zoneLight.position.set(center.x, 3.2, center.z)
    this.scene.add(zoneLight)

    // 耳室地面标记：一圈浅环
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.4, 3.5, 48),
      new THREE.MeshBasicMaterial({ color: 0x2c2c2c, side: THREE.DoubleSide }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set(center.x, 0.01, center.z)
    group.add(ring)

    // 展品围成一圈，面向圆心
    era.phones.forEach((phone, i) => {
      const angle = (i / Math.max(era.phones.length, 1)) * Math.PI * 2
      const r = 2.6
      const base = new THREE.Vector3(center.x + Math.sin(angle) * r, 0, center.z + Math.cos(angle) * r)
      const anchor = this.createExhibit(phone, era.room.id, base)
      anchor.object.lookAt(center.x, anchor.object.position.y, center.z)
      group.add(anchor.object)
      this.anchors.set(phone.id, anchor)
    })

    this.scene.add(group)
    this.zoneGroups.set(era.room.id, { group, center })
  }

  /** 走廊展区布展：居中一件，两侧沿墙展开（视线简洁，规范 §13）。 */
  private placeExhibits(zone: HallZone, group: THREE.Group, center: THREE.Vector3, centerAhead: boolean) {
    const phones = zone.phones
    const wallZStart = 1.6
    const wallZStep = Math.min(2.3, 9 / Math.max(Math.ceil((phones.length - 1) / 2), 1))

    phones.forEach((phone, i) => {
      let base: THREE.Vector3
      let faceAngle: number
      if (i === 0 && centerAhead) {
        // 第一件迎面居中
        base = new THREE.Vector3(center.x, 0, center.z - 3.2)
        faceAngle = 0
      } else {
        const wallIdx = i === 0 ? 0 : Math.floor((i - 1) / 2)
        const side = i === 0 ? 1 : (i - 1) % 2 === 0 ? -1 : 1
        base = new THREE.Vector3(center.x + side * 3.4, 0, center.z + wallZStart - wallIdx * wallZStep)
        faceAngle = side * -Math.PI / 2
      }
      const anchor = this.createExhibit(phone, zone.room.id, base)
      anchor.object.rotation.y = faceAngle
      group.add(anchor.object)
      this.anchors.set(phone.id, anchor)
    })
  }

  /** 单件展品：展座 + 内容（3D / 实拍图版 / 线稿替代）+ 展签（规范 §13–§15）。 */
  private createExhibit(phone: Phone, roomId: string, base: THREE.Vector3): HallExhibitAnchor {
    const object = new THREE.Group()
    object.position.copy(base)

    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.55, metalness: 0.3 })
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.02, 0.5), pedestalMat)
    pedestal.position.y = 0.51
    pedestal.castShadow = true
    object.add(pedestal)
    this.track(pedestalMat)
    this.track(pedestal.geometry)

    const content = new THREE.Group()
    content.position.y = 1.02
    object.add(content)

    const hero = resolvePhoneImage(phone, 'hero')

    if (phone.model) {
      // 3D 展品（规范 §15：approved real image 之下，3D model 优先；这里 3D 与照片共存）
      void loadModel(phone.model)
        .then((model) => {
          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3())
          const scale = 1.15 / Math.max(size.y, 0.001)
          model.scale.setScalar(scale)
          const recenter = new THREE.Box3().setFromObject(model)
          const c = recenter.getCenter(new THREE.Vector3())
          model.position.sub(c)
          model.position.y += 0.62
          content.add(model)
          this.trackTree(model)
        })
        .catch(() => {
          this.addPhotoPanel(content, hero)
        })
    } else {
      this.addPhotoPanel(content, hero)
    }

    // 展签（规范 §14：MM / 031 · NOKIA 3310 · 1999）
    const plaqueTex = makePlaqueTexture(phone.exhibitNo ?? 'MM', phone.name, phone.releaseYear)
    const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex, transparent: true, toneMapped: false })
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.32), plaqueMat)
    plaque.position.set(0, 0.6, 0.27)
    object.add(plaque)
    this.track(plaqueTex)
    this.track(plaqueMat)
    this.track(plaque.geometry)

    const anchor: HallExhibitAnchor = {
      phoneId: phone.id,
      roomId,
      isTreasure: phone.exhibitLevel === 3,
      lookPos: base.clone().add(new THREE.Vector3(0, 1.35, 0)),
      viewPos: this.computeViewPos(base, object.rotation.y),
      object,
    }
    object.userData.anchor = anchor
    return anchor
  }

  private addPhotoPanel(content: THREE.Group, hero: ReturnType<typeof resolvePhoneImage>) {
    const aspect = hero?.width && hero?.height ? hero.width / hero.height : 0.75
    const h = 1.15
    const w = h * aspect

    if (hero) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x0c0c0c })
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
      panel.position.y = 0.62
      content.add(panel)
      this.track(mat)
      this.track(panel.geometry)
      const img = new Image()
      img.src = assetSrc(hero, true)
      img.decoding = 'async'
      img.onload = () => {
        const tex = new THREE.Texture(img)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.needsUpdate = true
        mat.map = tex
        mat.color.set(0xffffff)
        mat.needsUpdate = true
        this.track(tex)
      }
    } else {
      // 线稿替代：一块抽象机身（规范 §15 fallback）
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x15151a,
        roughness: 0.35,
        metalness: 0.2,
        clearcoat: 0.6,
      })
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.5 * Math.max(aspect / 0.75, 0.6), h, 0.055), mat)
      slab.position.y = 0.62
      content.add(slab)
      this.track(mat)
      this.track(slab.geometry)
    }
  }

  private computeViewPos(base: THREE.Vector3, rotationY: number): THREE.Vector3 {
    // 相机停在展品面向的方向上（展品朝向 + 展台退后 2.6）
    const dir = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY))
    return base.clone().addScaledVector(dir, 2.6).add(new THREE.Vector3(0, 1.5, 0))
  }

  // ------------------------------------------------------------
  // 相机编排（规范 §11 / §26）
  // ------------------------------------------------------------

  /** 当前滚动应处的位姿序号空间位置（0..poses.length-1）。 */
  get poseCount(): number {
    return this.poses.length
  }

  poseForRoom(roomId: string): CameraPose | undefined {
    const era = this.eraPoses.get(roomId)
    if (era) return era
    const idx = this.poseIndex.get(roomId)
    return idx === undefined ? undefined : this.poses[idx]
  }

  /** 滚动驱动（规范 §7）：view 层把页面滚动映射成 0..N-1 的位姿插值。 */
  applyScrollPose(t: number) {
    this.scrollT = THREE.MathUtils.clamp(t, 0, this.poses.length - 1)
    if (this.hallCamera.isFlying) return // 聚焦飞行期间滚动不抢相机
    const i = Math.min(Math.floor(this.scrollT), this.poses.length - 2)
    const f = this.scrollT - i
    const pose = lerpPose(this.poses[i]!, this.poses[i + 1]!, f, this.scratchPose)
    this.cameraController.camera.position.copy(pose.pos)
    this.hallCamera.lookAt(pose.look)
  }

  /** 聚焦某件展品（规范 §26：Hall → Focus → Exhibit）。 */
  async focusExhibit(phoneId: string): Promise<boolean> {
    const anchor = this.anchors.get(phoneId)
    if (!anchor) return false
    await this.hallCamera.moveTo(
      { pos: anchor.viewPos, look: anchor.lookPos },
      { duration: this.plan.reduced ? 0.01 : 1.4 },
    )
    return true
  }

  /** 进入某房间（规范 §11 enterRoom）：目前用于年代耳室（走廊房间由滚动驱动）。 */
  async enterRoom(roomId: string): Promise<boolean> {
    const pose = this.poseForRoom(roomId)
    if (!pose) return false
    await this.hallCamera.moveTo(pose, { duration: this.plan.reduced ? 0.01 : 1.8 })
    return true
  }

  /** 返回走廊当前滚动位姿（规范 §26：Detail → Hall，不重载场景）。 */
  async exitRoom(): Promise<void> {
    this.hallCamera.cancel()
    this.applyScrollPose(this.scrollT)
  }

  // ------------------------------------------------------------
  // 拾取与高亮（规范 §14：靠近或点击 → VIEW EXHIBIT）
  // ------------------------------------------------------------

  pick(ndcX: number, ndcY: number): HallExhibitAnchor | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.cameraController.camera)
    const targets: THREE.Object3D[] = []
    this.zoneGroups.forEach(({ group }) => {
      if (group.visible) targets.push(group)
    })
    const hits = this.raycaster.intersectObjects(targets, true)
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object
      while (obj) {
        const anchor = obj.userData.anchor as HallExhibitAnchor | undefined
        if (anchor) return anchor
        obj = obj.parent
      }
    }
    return null
  }

  setHighlight(anchor: HallExhibitAnchor | null) {
    this.highlighted = anchor
  }

  update(dt: number, elapsed: number) {
    this.dust?.update(dt, elapsed)
    this.hallCamera.update(dt)

    // 视锥 + 距离预算：只保留相机附近的展品（规范 §51 / §53）
    const cam = this.cameraController.camera
    const budget = visibleBudget()
    const camPos = cam.position
    const byDistance: Array<{ anchor: HallExhibitAnchor; d: number }> = []
    this.anchors.forEach((anchor) => {
      const d = anchor.object.position.distanceTo(camPos)
      anchor.object.visible = d < FOG_FAR * 0.95
      if (anchor.object.visible) byDistance.push({ anchor, d })
    })
    byDistance.sort((a, b) => a.d - b.d)
    byDistance.forEach(({ anchor }, i) => {
      const content = anchor.object.children[1]
      if (content) content.visible = i < budget
    })

    // 高亮：内容轻轻放大（规范 §76：克制）
    this.anchors.forEach((anchor) => {
      const content = anchor.object.children[1] as THREE.Group | undefined
      if (!content) return
      const target = anchor === this.highlighted ? 1.05 : 1
      content.scale.lerp(this.cameraDelta.set(target, target, target), Math.min(1, dt * 8))
    })
  }

  dispose() {
    this.dust?.dispose()
    super.dispose()
  }
}
