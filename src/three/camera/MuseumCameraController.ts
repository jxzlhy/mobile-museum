import * as THREE from 'three'

// MuseumCameraController（规范 §11）：展厅相机的统一运动层。
// GSAP 补间、任何时刻可被用户输入打断（规范 §56）；
// reduced motion 时走最短路径 —— 直接定位（规范 §57）。

export interface CameraPose {
  pos: THREE.Vector3
  look: THREE.Vector3
}

export function makePose(px: number, py: number, pz: number, lx: number, ly: number, lz: number): CameraPose {
  return { pos: new THREE.Vector3(px, py, pz), look: new THREE.Vector3(lx, ly, lz) }
}

export function lerpPose(a: CameraPose, b: CameraPose, t: number, out: CameraPose): CameraPose {
  out.pos.lerpVectors(a.pos, b.pos, t)
  out.look.lerpVectors(a.look, b.look, t)
  return out
}

export class MuseumCameraController {
  /** 当前注视点（世界坐标）。 */
  private look = new THREE.Vector3(0, 1, 0)
  /** 手动环视偏航（拖拽产生，rad）。 */
  private yaw = 0
  private yawTarget = 0
  private tweenToken = 0
  private flying = false
  /** 每帧插值使用的工作位姿。 */
  private work = { pos: new THREE.Vector3(), look: new THREE.Vector3() }

  constructor(private camera: THREE.PerspectiveCamera) {}

  get currentLook(): THREE.Vector3 {
    return this.look
  }

  get isFlying(): boolean {
    return this.flying
  }

  /** 不做动画，直接落到某个位姿（进入页面 / reduced motion）。 */
  setImmediate(pose: CameraPose) {
    this.cancel()
    this.camera.position.copy(pose.pos)
    this.look.copy(pose.look)
    this.yaw = this.yawTarget = 0
    this.camera.lookAt(pose.look)
  }

  /** 立即改变注视点（不移动相机）。 */
  lookAt(target: THREE.Vector3) {
    this.look.copy(target)
  }

  /** moveTo（规范 §11）：带补间的相机飞行。可被 cancel() 打断。 */
  async moveTo(pose: CameraPose, opts: { duration?: number; reduced?: boolean } = {}) {
    const duration = opts.duration ?? 1.6
    this.cancel()
    if (opts.reduced || duration <= 0.01) {
      this.setImmediate(pose)
      return
    }
    const token = ++this.tweenToken
    this.flying = true
    const from = {
      px: this.camera.position.x,
      py: this.camera.position.y,
      pz: this.camera.position.z,
      lx: this.look.x,
      ly: this.look.y,
      lz: this.look.z,
    }
    const to = { px: pose.pos.x, py: pose.pos.y, pz: pose.pos.z, lx: pose.look.x, ly: pose.look.y, lz: pose.look.z }
    const obj = { t: 0 }
    await import('gsap').then(
      ({ gsap }) =>
        new Promise<void>((resolve) => {
          gsap.to(obj, {
            t: 1,
            duration,
            ease: 'power2.inOut',
            onUpdate: () => {
              if (token !== this.tweenToken) return
              this.work.pos.set(
                from.px + (to.px - from.px) * obj.t,
                from.py + (to.py - from.py) * obj.t,
                from.pz + (to.pz - from.pz) * obj.t,
              )
              this.work.look.set(
                from.lx + (to.lx - from.lx) * obj.t,
                from.ly + (to.ly - from.ly) * obj.t,
                from.lz + (to.lz - from.lz) * obj.t,
              )
              this.camera.position.copy(this.work.pos)
              this.look.copy(this.work.look)
            },
            onComplete: () => {
              if (token === this.tweenToken) this.flying = false
              resolve()
            },
          })
        }),
    )
  }

  /** 用户输入打断当前动画（规范 §56：任何时刻可打断）。 */
  cancel() {
    this.tweenToken++
    this.flying = false
  }

  /** 拖拽环视（规范 §8：桌面端轻度自由探索）。 */
  addYaw(delta: number) {
    this.yawTarget = THREE.MathUtils.clamp(this.yawTarget + delta, -0.55, 0.55)
  }

  resetYaw() {
    this.yawTarget = 0
  }

  /** 每帧调用：把 yaw 平滑收敛到目标并应用到相机朝向。 */
  update(dt: number) {
    this.yaw += (this.yawTarget - this.yaw) * Math.min(1, dt * 6)
    const dir = this.work.look.copy(this.look).sub(this.camera.position)
    if (dir.lengthSq() < 1e-6) return
    dir.applyAxisAngle(UP, this.yaw)
    this.camera.lookAt(this.work.pos.copy(this.camera.position).add(dir))
  }
}

const UP = new THREE.Vector3(0, 1, 0)
