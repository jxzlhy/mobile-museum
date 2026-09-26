import type { Router } from 'vue-router'

// ============================================================
// Session / Resume（V0.9 规范 §38–§41 / §76 / §77）：
// 记录最近一次参观位置（museum.session），首页 CONTINUE 恢复。
// 与 Recently Visited（列表）严格分开：Session = 最近一次未完成的上下文。
// Resume 路由来自本地存储 —— 打开前必须校验合法性（§76），
// 且恢复必须由用户主动点击，不自动跳转（§77）。
// ============================================================

const SESSION_KEY = 'museum.session'

export interface MuseumSession {
  route: string
  phoneId?: string
  roomId?: string
  storyId?: string
  journeyId?: string
  /** 面向用户的简短描述（如「触摸革命 · 03 / 06」）。 */
  label?: string
  timestamp: number
}

function read(): MuseumSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MuseumSession
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.route !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

/** 允许恢复的站内路径白名单（§76：route 必须可解析且非外部）。 */
function isSafeRoute(route: string): boolean {
  return route.startsWith('/') && !route.startsWith('//') && !route.includes('javascript:')
}

export const sessionService = {
  getSession(): MuseumSession | null {
    const s = read()
    if (!s || !isSafeRoute(s.route)) return null
    // 7 天过期
    if (Date.now() - s.timestamp > 7 * 24 * 3600 * 1000) return null
    return s
  },

  save(session: Omit<MuseumSession, 'timestamp'>) {
    if (!isSafeRoute(session.route)) return
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, timestamp: Date.now() }))
    } catch {
      /* ignore */
    }
  },

  clear() {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  },

  /** 在路由上挂全局记录器（App/main 调用一次）。 */
  installRecorder(router: Router) {
    router.afterEach((to) => {
      if (to.name === 'not-found' || to.name === 'home') return
      // 每个内容域写一个语义 label
      const label = typeof to.meta?.title === 'string' ? to.meta.title.split(' — ')[0] : to.path
      this.save({ route: to.fullPath, label })
    })
  },
}
