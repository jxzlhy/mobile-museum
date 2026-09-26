/* MOBILE MUSEUM Service Worker（V0.9 规范 §26 / §34–§36 / §62–§66）
 * 只有一个 active SW；策略：
 *   App Shell / 带哈希静态资源 → Cache First
 *   页面导航 → Network First，回退缓存 index.html（离线仍可逛本地内容）
 *   图片 / 音频 → 运行时缓存 + 数量上限（不预缓存大媒体，§32/§65/§66）
 * 升级：新 SW 安装后等待，页面提示 NEW MUSEUM VERSION AVAILABLE → UPDATE（§63）
 */
const VERSION = 'museum-v1'
const SHELL_CACHE = `${VERSION}-shell`
const ASSET_CACHE = `${VERSION}-assets`
const MEDIA_CACHE = `${VERSION}-media`
const MEDIA_MAX = 80

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {}),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > max) {
    for (const key of keys.slice(0, keys.length - max)) await cache.delete(key)
  }
}

function isHashedAsset(url) {
  return url.pathname.includes('/assets/')
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res && res.ok && res.type === 'basic') cache.put(request, res.clone())
  return res
}

async function networkFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(request)
    if (res && res.ok && res.type === 'basic') {
      cache.put(request, res.clone())
      if (max) await trimCache(cacheName, max)
    }
    return res
  } catch {
    const hit = await cache.match(request)
    if (hit) return hit
    throw new Error('offline-missing')
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return

  // 页面导航：网络优先，离线回退 shell（SPA 路由继续可用）
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req)
        } catch {
          const cache = await caches.open(SHELL_CACHE)
          return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error()
        }
      })(),
    )
    return
  }

  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(req, ASSET_CACHE))
    return
  }
  if (url.pathname.includes('/phones/') || url.pathname.includes('/icons/')) {
    event.respondWith(cacheFirst(req, MEDIA_CACHE).finally(() => trimCache(MEDIA_CACHE, MEDIA_MAX)))
    return
  }
  if (url.pathname.includes('/audio/')) {
    event.respondWith(
      networkFirst(req, MEDIA_CACHE, MEDIA_MAX).catch(() => new Response('', { status: 504 })),
    )
    return
  }
})
