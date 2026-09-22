import * as THREE from 'three'
import { MuseumScene } from '../core/MuseumScene'
import { createMuseumLights, createShadowGround } from '../lights/museumLights'
import { loadModel } from '../core/ModelLoader'
import { DustField } from '../effects/particles'
import { resolvePhoneImage, assetSrc } from '@/data/assets'
import type { Phone } from '@/data/types'
import type { HistoricalScene } from '@/data/scenes'
import { MuseumCameraController, makePose } from '../camera/MuseumCameraController'
import '../models'

// ============================================================
// TimeMachineScene（V0.7 规范 §9–§17 / §30–§36 / §61–§66 / §85–§86）：
// 数字展览式历史场景 —— Hero 手机 + 相关设备 + 抽象技术标记 +
// 时代版式光。不做街道/建筑/人物（§11）。所有对象来自数据（§15）。
// Mobile：1 hero + 1–3 objects；Desktop：1–6（§35）。
// 相机位移短、平滑、可打断（§31）；reduced motion 直接定位（§83）。
// ============================================================

const LIGHT_MOODS = {
  'industrial-warm': { key: 0xffe0b8, keyI: 2.6, rim: 0xff9a5a, rimI: 1.1, fill: 0xffd9a8, fillI: 0.9, env: 0.55 },
  'neutral-commercial': { key: 0xffffff, keyI: 2.6, rim: 0xc9d6ff, rimI: 1.2, fill: 0xf2f4ff, fillI: 1.0, env: 0.8 },
  'clean-digital': { key: 0xf4f7ff, keyI: 2.8, rim: 0x9db8ff, rimI: 1.4, fill: 0xffffff, fillI: 1.15, env: 1.0 },
  'minimal-reflective': { key: 0xffffff, keyI: 2.4, rim: 0xbfc9d9, rimI: 1.6, fill: 0xe8ecf2, fillI: 1.1, env: 1.35 },
} as const

export interface TimeMachineScenePlan {
  scene: HistoricalScene
  hero: Phone | undefined
  related: Array<{ phone: Phone; position: { x: number; y: number; z: number }; scale: number }>
  reduced: boolean
}

export interface SceneAnchor {
  id: string
  type: 'phone' | 'technology'
  refId: string
  label: string
  lookPos: THREE.Vector3
  viewPos: THREE.Vector3
}

export class TimeMachineScene extends MuseumScene {
  readonly name = 'time-machine'
  readonly sceneCamera: MuseumCameraController

  private plan: TimeMachineScenePlan
  private anchors = new Map<string, SceneAnchor>()
  private heroGroup: THREE.Group | null = null
  private objectGroups = new Map<string, THREE.Group>()
  private dust: DustField | null = null
  private raycaster = new THREE.Raycaster()
  private spinVel = 0
  private heroSpin = 0
  private dragging = false

  constructor(plan: TimeMachineScenePlan) {
    super()
    this.plan = plan
    this.sceneCamera = new MuseumCameraController(this.cameraController.camera)
  }

  /** 运行时更新 reduced motion（§83）。 */
  setReduced(v: boolean) {
    this.plan.reduced = v
  }

  getAnchor(id: string): SceneAnchor | undefined {
    return this.anchors.get(id)
  }

  anchorsByType(type: 'phone' | 'technology'): SceneAnchor[] {
    return [...this.anchors.values()].filter((a) => a.type === type)
  }

  async build() {
    const mood = LIGHT_MOODS[this.plan.scene.lightMood]
    this.scene.fog = new THREE.Fog(0x080808, 12, 30)
    this.scene.environmentIntensity = mood.env

    const lights = createMuseumLights(false)
    lights.key.color.set(mood.key)
    lights.key.intensity = mood.keyI
    lights.rim.color.set(mood.rim)
    lights.rim.intensity = mood.rimI
    this.scene.add(lights.group)
    // 时代补光（§61：仅视觉方向，不代表历史事实）
    const eraFill = new THREE.DirectionalLight(mood.fill, mood.fillI)
    eraFill.position.set(0.8, 1.8, 4.5)
    this.scene.add(eraFill)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(60, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.95 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.02
    this.scene.add(floor)
    this.track(floor.geometry)
    this.track(floor.material as THREE.Material)
    this.scene.add(createShadowGround(3.4))

    // ---- Hero（§93：唯一焦点；真实比例，标记 presentation 时才放大）----
    if (this.plan.hero?.model) {
      const model = await loadModel(this.plan.hero.model)
      const heroGroup = new THREE.Group()
      model.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) mesh.castShadow = true
      })
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const scale = 2.3 / Math.max(size.y, 0.001)
      model.scale.setScalar(scale)
      const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
      model.position.sub(center)
      heroGroup.add(model)
      heroGroup.position.set(0, 0.15, 0)
      this.scene.add(heroGroup)
      this.trackTree(model)
      this.heroGroup = heroGroup
      this.registerPhoneAnchor('hero', this.plan.hero, heroGroup)
    }

    // ---- Related Devices（§64：前景/中景/背景，禁止等距排队）----
    let built = 0
    const budget = this.desktopBudget()
    for (const rel of this.plan.related) {
      if (built >= budget) break
      const pos = rel.position
      const group = new THREE.Group()
      if (rel.phone.model) {
        try {
          const model = await loadModel(rel.phone.model)
          model.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            if (mesh.isMesh) mesh.castShadow = true
          })
          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3())
          const scale = (1.8 / Math.max(size.y, 0.001)) * rel.scale
          model.scale.setScalar(scale)
          const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
          model.position.sub(center)
          group.add(model)
          this.trackTree(model)
        } catch {
          this.addPhotoFallback(group, rel.phone)
        }
      } else {
        this.addPhotoFallback(group, rel.phone)
      }
      group.position.set(pos.x, 0.1, pos.z)
      group.rotation.y = pos.x > 0 ? -0.5 : 0.5
      this.scene.add(group)
      this.registerPhoneAnchor(rel.phone.id, rel.phone, group)
      this.objectGroups.set(rel.phone.id, group)
      built += 1
    }

    // ---- 抽象技术标记（§17 / §29：光点 + 标签，明确为 ABSTRACT）----
    for (const obj of this.plan.scene.objects) {
      if (obj.type !== 'technology' || !obj.position) continue
      const marker = this.makeTechMarker(obj.id, obj.refId ?? '')
      marker.position.set(obj.position.x, obj.position.y, obj.position.z)
      this.scene.add(marker)
      this.objectGroups.set(obj.id, marker)
      this.registerTechAnchor(obj.id, obj.refId ?? '', marker)
    }

    this.dust = new DustField()
    this.scene.add(this.dust.points)

    this.cameraController.setFov(40)
    this.resize(window.innerWidth, window.innerHeight)
    const heroPose = makePose(0, 0.5, 6.2, 0, 0.9, 0)
    this.sceneCamera.setImmediate(heroPose)
  }

  private desktopBudget(): number {
    const tier = (typeof window !== 'undefined' && window.innerWidth >= 1080) ? 6 : 3
    return Math.min(tier, this.plan.related.length)
  }

  private addPhotoFallback(group: THREE.Group, phone: Phone) {
    // 实拍优先（§36）：approved 图版；无图则抽象机身（§77），均非伪造实拍
    const hero = resolvePhoneImage(phone, 'hero')
    const mat = new THREE.MeshBasicMaterial({ color: 0x101012 })
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5), mat)
    panel.position.y = 0.85
    group.add(panel)
    this.track(mat)
    this.track(panel.geometry)
    if (hero) {
      const img = new Image()
      img.src = assetSrc(hero, true)
      img.onload = () => {
        const tex = new THREE.Texture(img)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.needsUpdate = true
        mat.map = tex
        mat.color.set(0xffffff)
        mat.needsUpdate = true
        this.track(tex)
      }
    }
  }

  /** 技术标记：柔光小球 + 画布标签（抽象表达，§17）。 */
  private makeTechMarker(id: string, techName: string): THREE.Group {
    const group = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: 0xb8b2a4, transparent: true, opacity: 0.9 })
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 20), mat)
    group.add(dot)
    this.track(mat)
    this.track(dot.geometry)

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(184, 178, 164, 0.95)'
    ctx.font = '500 44px "SF Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(techName.toUpperCase().slice(0, 18), 256, 78)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.29), labelMat)
    label.position.set(0, -0.32, 0)
    group.add(label)
    this.track(tex)
    this.track(labelMat)
    this.track(label.geometry)
    void id
    return group
  }

  private registerPhoneAnchor(id: string, phone: Phone, group: THREE.Group) {
    const look = new THREE.Vector3()
    new THREE.Box3().setFromObject(group).getCenter(look)
    const dir = look.clone().setY(0).normalize()
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1)
    this.anchors.set(id, {
      id,
      type: 'phone',
      refId: phone.id,
      label: phone.name,
      lookPos: look,
      viewPos: look.clone().addScaledVector(dir, 3.4).add(new THREE.Vector3(0, 0.5, 0)),
    })
  }

  private registerTechAnchor(id: string, refId: string, group: THREE.Group) {
    const look = group.position.clone()
    this.anchors.set(id, {
      id,
      type: 'technology',
      refId,
      label: 'TECHNOLOGY',
      lookPos: look,
      viewPos: look.clone().add(new THREE.Vector3(0, 0.2, 2.4)),
    })
  }

  // ---- 相机编排（§30–§31）----

  async focusObject(id: string): Promise<boolean> {
    const anchor = this.anchors.get(id)
    if (!anchor) return false
    await this.sceneCamera.moveTo(
      { pos: anchor.viewPos, look: anchor.lookPos },
      { duration: this.plan.reduced ? 0.01 : 1.1 },
    )
    return true
  }

  async focusPhone(phoneId: string) {
    return this.focusObject(this.anchors.has(phoneId) ? phoneId : 'hero')
  }

  async focusTechnology(technologyId: string) {
    const anchor = [...this.anchors.values()].find((a) => a.type === 'technology' && a.refId === technologyId)
    return anchor ? this.focusObject(anchor.id) : false
  }

  async focusEvent(eventId: string) {
    // 事件以档案文本牌存在于场景时按 id 聚焦；当前场景未置入事件牌则回 Hero
    return this.anchors.has(eventId) ? this.focusObject(eventId) : this.focusObject('hero')
  }

  async reset() {
    this.sceneCamera.cancel()
    const heroPose = makePose(0, 0.5, 6.2, 0, 0.9, 0)
    if (this.plan.reduced) this.sceneCamera.setImmediate(heroPose)
    else await this.sceneCamera.moveTo(heroPose, { duration: 1.0 })
  }

  dragBy(dx: number) {
    this.dragging = true
    this.spinVel = dx * 0.004
  }

  endDrag() {
    this.dragging = false
  }

  pick(ndcX: number, ndcY: number): SceneAnchor | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.cameraController.camera)
    // 按组求交，取距离最近者
    let best: { anchor: SceneAnchor; dist: number } | null = null
    for (const anchor of this.anchors.values()) {
      const group = anchor.id === 'hero' ? this.heroGroup : this.objectGroups.get(anchor.id)
      if (!group || !group.visible) continue
      const hits = this.raycaster.intersectObject(group, true)
      if (hits.length > 0 && (!best || hits[0]!.distance < best.dist)) {
        best = { anchor, dist: hits[0]!.distance }
      }
    }
    return best?.anchor ?? null
  }

  resize(width: number, height: number) {
    super.resize(width, height)
    const aspect = width / Math.max(height, 1)
    this.cameraController.setFov(aspect < 0.8 ? 50 : 42)
  }

  update(dt: number, elapsed: number) {
    this.dust?.update(dt, elapsed)
    this.sceneCamera.update(dt)
    if (this.heroGroup && !this.dragging) {
      this.heroSpin += this.spinVel
      this.spinVel *= Math.pow(0.92, dt * 60)
      this.heroGroup.rotation.y = this.heroSpin + Math.sin(elapsed * 0.35) * 0.02
      this.heroGroup.position.y = 0.15 + Math.sin(elapsed * 0.6) * 0.03
    }
  }

  dispose() {
    this.dust?.dispose()
    super.dispose()
  }
}
