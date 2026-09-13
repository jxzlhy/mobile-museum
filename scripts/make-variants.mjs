// V0.2.7 §18：为每台设备的 hero 生成变体（thumbnail 480 / card 800）。
// 用法: node scripts/make-variants.mjs
// 幂等：已有变体跳过。格式优先 webp，sips 不支持时回退原格式。

import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { PUBLIC_PHONES_DIR, fileExists, makeVariant } from './lib/assets-common.mjs'

const dirs = (await fileExists(PUBLIC_PHONES_DIR)) ? await readdir(PUBLIC_PHONES_DIR, { withFileTypes: true }) : []
let made = 0

for (const d of dirs) {
  if (!d.isDirectory()) continue
  const dir = path.join(PUBLIC_PHONES_DIR, d.name)
  const files = await readdir(dir)
  const hero = files.find((f) => /^hero\.(webp|jpe?g|png)$/i.test(f))
  if (!hero) continue
  const ext = path.extname(hero)
  const base = path.basename(hero, ext)

  for (const [variant, size] of [['thumb', 480], ['card', 800]]) {
    const variantName = `${base}.${variant}.webp`
    if (await fileExists(path.join(dir, variantName))) continue
    const out = makeVariant(path.join(dir, hero), path.join(dir, variantName), size)
    if (out) { made++; continue }
    // webp 失败 → 原格式回退
    const fallback = `${base}.${variant}${ext}`
    if (await fileExists(path.join(dir, fallback))) continue
    if (makeVariant(path.join(dir, hero), path.join(dir, fallback), size)) made++
  }
}
console.log(`make-variants: ${made} 个变体生成（thumbnail 480 / card 800）`)
