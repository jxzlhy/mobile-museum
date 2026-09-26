// 路径工具（V0.9 规范 §25 / §50）：
// 所有静态资源路径必须兼容 GitHub Pages 子路径部署，
// 统一经 import.meta.env.BASE_URL 拼接，禁止写死根路径。

/** 给以 / 开头的静态资源路径加上部署 base（如 /mobile-museum/）。 */
export function withBase(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path
  const base = import.meta.env.BASE_URL || '/'
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path)
}
