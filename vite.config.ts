import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

// V0.2.5/§8.2 本地导入的辅助通道（仅 dev server 存在）：
// 浏览器页面在宿主网络下抓取 Wikimedia 资源后，把 base64 与
// 来源元数据 POST 到 /__asset-ingest，落盘为 public/phones/<id>/。
// 校验 id/文件名格式，杜绝路径穿越；生产构建不含此中间件。
function assetIngestMiddleware() {
  return {
    name: 'mobile-museum-asset-ingest',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/__asset-ingest', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString()
          if (body.length > 30 * 1024 * 1024) req.destroy()
        })
        req.on('end', () => {
          try {
            const { phoneId, file, base64, sidecar } = JSON.parse(body)
            if (!/^[a-z0-9][a-z0-9-]*$/.test(phoneId)) throw new Error('非法 phoneId')
            if (!/^[a-z0-9][a-z0-9.-]*$/i.test(file)) throw new Error('非法文件名')
            const dir = path.join(process.cwd(), 'public', 'phones', phoneId)
            fs.mkdirSync(dir, { recursive: true })
            fs.writeFileSync(path.join(dir, file), Buffer.from(base64, 'base64'))
            if (sidecar) {
              fs.writeFileSync(path.join(dir, 'asset.json'), JSON.stringify(sidecar, null, 2))
            }
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, file }))
          } catch (e) {
            res.statusCode = 400
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // GitHub Pages 部署（§8.2）：`npm run build:pages` 时资源带 /mobile-museum/ 前缀；
  // 本地开发与一般构建不受影响。
  const base = mode === 'github' ? '/mobile-museum/' : '/'
  return {
  plugins: [vue(), assetIngestMiddleware()],
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Injected into every SCSS compilation so components can use tokens directly.
        additionalData: `@use "@/styles/tokens" as *;\n`,
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 950,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
  },
  }
})
