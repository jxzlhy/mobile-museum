// 一次性脚本：生成 PWA 图标（黑底 + 浅色细线「M」几何标记）
// 用法: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

function crc32(buf) {
  let c, table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // 每行前加 filter byte 0
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function drawIcon(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4)
  const bg = [8, 8, 8, 255] // #080808
  const line = [184, 178, 164, 255] // #b8b2a4
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3]
  }
  const rect = (x, y, w, h, c) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, c)
  }
  rect(0, 0, size, size, bg)
  // maskable 安全区：内容缩进到 80%
  const pad = maskable ? size * 0.14 : size * 0.12
  const stroke = Math.max(2, Math.round(size / 64))
  // 外框（细线）
  const o = Math.round(pad)
  rect(o, o, size - o * 2, stroke, line)
  rect(o, size - o - stroke, size - o * 2, stroke, line)
  rect(o, o, stroke, size - o * 2, line)
  rect(size - o - stroke, o, stroke, size - o * 2, line)
  // 中央「M」：两竖 + 中间 V（几何化）
  const cx = size / 2
  const mH = size * 0.34
  const mTop = (size - mH) / 2
  const barW = Math.max(3, Math.round(size / 40))
  const half = size * 0.115
  rect(cx - half - barW / 2, mTop, barW, mH, line) // 左竖
  rect(cx + half - barW / 2, mTop, barW, mH, line) // 右竖
  // 中间 V：两条斜线（逐行近似）
  const vTop = mTop + mH * 0.08
  const vBottom = mTop + mH * 0.62
  for (let y = vTop; y < vBottom; y++) {
    const t = (y - vTop) / (vBottom - vTop)
    const spread = (half - barW) * (1 - t) + barW * 0.2 * t
    rect(Math.round(cx - spread), Math.round(y), barW, 1, line)
    rect(Math.round(cx + spread - barW), Math.round(y), barW, 1, line)
  }
  // 底部年份点
  rect(cx - stroke / 2, mTop + mH + size * 0.06, stroke, Math.max(2, stroke), line)
  return px
}

mkdirSync('public/icons', { recursive: true })
for (const [name, size, opts] of [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['maskable-512.png', 512, { maskable: true }],
]) {
  writeFileSync(`public/icons/${name}`, png(size, size, drawIcon(size, opts)))
  console.log('icon:', name, size + 'x' + size)
}
