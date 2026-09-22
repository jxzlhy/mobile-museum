import * as THREE from 'three'
import { loadModel } from './ModelLoader'

// ExhibitViewer（规范 §23–§25）：覆盖层里的 3D 展品查看器。
// 独立 renderer 与渲染循环（只在打开时运行，关闭即销毁），
// 支持拖拽旋转 / 滚轮·双指缩放 / 复位。移动端 touch drag，桌面端 mouse drag。

export class ExhibitViewer {
  private renderer: THREE.WebGLRenderer | null = null
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private model: THREE.Group | null = null
  private rafId = 0
  private running = false
  private disposed = false

  // 轨道状态：方位角 / 俯仰角 / 距离
  private theta = 0.5
  private phi = 0.12
  private radius = 4.2
  private readonly defaults = { theta: 0.5, phi: 0.12, radius: 4.2 }

  private canvas: HTMLCanvasElement | null = null
  private detach: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40)

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.shadowMap.enabled = false

    // 柔和三灯（复用展厅光照气质，规范 §59）
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a22, 0.7)
    const key = new THREE.DirectionalLight(0xfff2e0, 2.4)
    key.position.set(3, 4, 3)
    const rim = new THREE.DirectionalLight(0x9db8ff, 1.8)
    rim.position.set(-3, 2, -3)
    this.scene.add(hemi, key, rim)

    this.bindEvents()
    this.resize()
    this.running = true
    this.loop()
  }

  async load(modelId: string) {
    const model = await loadModel(modelId)
    if (this.disposed) return
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const scale = 2.1 / Math.max(size.y, 0.001)
    model.scale.setScalar(scale)
    const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
    model.position.sub(center)
    this.model = model
    this.scene.add(model)
  }

  // ---- 交互 ----

  private bindEvents() {
    const canvas = this.canvas
    if (!canvas) return
    canvas.style.touchAction = 'none'

    let dragging = false
    let lastX = 0
    let lastY = 0
    let pinchDist = 0

    const onDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      canvas.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      this.theta -= (e.clientX - lastX) * 0.008
      this.phi = THREE.MathUtils.clamp(this.phi + (e.clientY - lastY) * 0.006, -0.6, 0.9)
      lastX = e.clientX
      lastY = e.clientY
    }
    const onUp = () => {
      dragging = false
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      this.radius = THREE.MathUtils.clamp(this.radius + e.deltaY * 0.004, 2.4, 7.5)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0]!.clientX - e.touches[1]!.clientX
        const dy = e.touches[0]!.clientY - e.touches[1]!.clientY
        const dist = Math.hypot(dx, dy)
        if (pinchDist > 0) {
          this.radius = THREE.MathUtils.clamp(this.radius - (dist - pinchDist) * 0.02, 2.4, 7.5)
        }
        pinchDist = dist
      }
    }
    const onTouchEnd = () => {
      pinchDist = 0
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: true })
    canvas.addEventListener('touchend', onTouchEnd)
    this.detach.push(() => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    })
  }

  reset() {
    this.theta = this.defaults.theta
    this.phi = this.defaults.phi
    this.radius = this.defaults.radius
  }

  resize() {
    if (!this.canvas || !this.renderer) return
    const { clientWidth, clientHeight } = this.canvas
    if (clientWidth === 0 || clientHeight === 0) return
    this.renderer.setSize(clientWidth, clientHeight, false)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
  }

  private loop = () => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.loop)
    if (!this.renderer) return

    const r = this.radius
    const y = Math.sin(this.phi) * r + 0.2
    const hz = Math.cos(this.phi) * r
    this.camera.position.set(Math.sin(this.theta) * hz, y, Math.cos(this.theta) * hz)
    this.camera.lookAt(0, 0.1, 0)

    if (this.model) this.model.rotation.y += 0.0015 // 极缓的自转（规范 §76：不炫技）
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.detach.forEach((off) => off())
    this.detach = []
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m) => (m as THREE.Material).dispose())
      }
    })
    this.scene.clear()
    this.renderer?.dispose()
    this.renderer = null
    this.model = null
  }
}
