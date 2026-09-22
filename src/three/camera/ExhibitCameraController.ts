import * as THREE from 'three'
import { MuseumCameraController, makePose, type CameraPose } from './MuseumCameraController'

// ============================================================
// ExhibitCameraController（V0.5 规范 §35）：
// focusPhone / focusPart / focusMaterial / focusDetail / reset。
// 动画必须短、平滑、可被用户输入打断。
// ============================================================

export interface ExhibitNodePose {
  /** 相机停靠位。 */
  pos: THREE.Vector3
  /** 注视位（部件中心）。 */
  look: THREE.Vector3
}

export class ExhibitCameraController extends MuseumCameraController {
  private nodePoses = new Map<string, ExhibitNodePose>()
  private defaultPose: CameraPose = makePose(0, 0.1, 5.4, 0, 0, 0)

  /** 场景注册部件 / 材料 / 细节对应的相机位姿。 */
  registerNode(id: string, pose: ExhibitNodePose) {
    this.nodePoses.set(id, pose)
  }

  setDefaultPose(pose: CameraPose) {
    this.defaultPose = pose
  }

  private async fly(pose: CameraPose, reduced?: boolean) {
    this.cancel()
    await this.moveTo(pose, { duration: reduced ? 0.01 : 0.9 })
  }

  /** 回到整机位。 */
  async focusPhone(reduced?: boolean) {
    this.cancel()
    await this.fly(this.defaultPose, reduced)
  }

  /** 聚焦某个部件 / 材料 / 细节节点。 */
  async focusNode(id: string, reduced?: boolean): Promise<boolean> {
    const pose = this.nodePoses.get(id)
    if (!pose) return false
    await this.fly({ pos: pose.pos, look: pose.look }, reduced)
    return true
  }

  async focusPart(id: string, reduced?: boolean) {
    return this.focusNode(id, reduced)
  }

  async focusMaterial(id: string, reduced?: boolean) {
    return this.focusNode(id, reduced)
  }

  async focusDetail(id: string, reduced?: boolean) {
    return this.focusNode(id, reduced)
  }

  async reset(reduced?: boolean) {
    await this.focusPhone(reduced)
  }
}
