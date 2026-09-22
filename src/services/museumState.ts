import { reactive } from 'vue'

// Museum State（规范 §48）：全站统一的博物馆参观状态。
// 各组件不再各自保存 Camera / 房间状态；3D 每帧数据仍留在场景层（规范 §57）。

export interface MuseumVisitState {
  /** 当前房间（展区 id 或年代 id，如 'history' / '1970s'）。 */
  currentRoom?: string
  /** 正在聚焦的展品（phone id）。 */
  focusPhoneId?: string
  /** 上一个房间（返回用）。 */
  previousRoom?: string
}

const state = reactive<MuseumVisitState>({})

export const museumState = {
  state,
  setRoom(roomId: string | undefined) {
    if (roomId && roomId !== state.currentRoom) {
      state.previousRoom = state.currentRoom
    }
    state.currentRoom = roomId
  },
  setFocus(phoneId: string | undefined) {
    state.focusPhoneId = phoneId
  },
  clearFocus() {
    state.focusPhoneId = undefined
  },
}
