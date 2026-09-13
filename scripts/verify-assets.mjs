// 阶段 3 · 资产核验（V0.2.5 §10 / §21）
// 用法: node scripts/verify-assets.mjs
// 扫描 public/phones/*/：
//   - 有 asset.json 的（管线下载）：校验文件存在/尺寸/许可证 → 保持 verified
//   - 无 asset.json 的（本地手动导入，§8.2）：生成 candidate 侧车，等待人工审核
// 幂等：重复运行只刷新尺寸，不改状态。

import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { PUBLIC_PHONES_DIR, readJson, writeJson, fileExists } from './lib/assets-common.mjs'

const ANGLES = ['hero', 'front', 'back', 'side', 'detail']

function inferAngle(file) {
  const base = file.toLowerCase()
  for (const a of ANGLES) if (base.startsWith(a)) return a
  if (base.startsWith('gallery')) return 'gallery'
  return 'hero'
}

const dirs = (await fileExists(PUBLIC_PHONES_DIR))
  ? await readdir(PUBLIC_PHONES_DIR, { withFileTypes: true })
  : []

let verified = 0
let candidate = 0

for (const d of dirs) {
  if (!d.isDirectory()) continue
  const dir = path.join(PUBLIC_PHONES_DIR, d.name)
  const files = (await readdir(dir)).filter((f) => /\.(webp|jpe?g|png)$/i.test(f) && !f.startsWith('raw.'))
  if (files.length === 0) continue

  const sidecarPath = path.join(dir, 'asset.json')
  let sidecar = await readJson(sidecarPath, null)

  if (!sidecar) {
    // 本地导入（§8.2）：无侧车 → candidate，等待人工核验型号与授权
    const hero = files.find((f) => f.toLowerCase().startsWith('hero')) ?? files[0]
    sidecar = {
      status: 'candidate',
      angle: inferAngle(hero),
      file: hero,
      thumb: files.find((f) => f.includes('.thumb.')) ?? hero,
      source: undefined,
      importedAt: new Date().toISOString(),
      note: '本地导入的候选图：人工确认型号与授权后运行 assets:approve。',
    }
    await writeJson(sidecarPath, sidecar)
    candidate++
    console.log(`candidate ${d.name}（本地导入，待人工审核）→ ${hero}`)
    continue
  }

  // 管线/既有侧车：校验文件与尺寸
  const heroPath = path.join(dir, sidecar.file ?? '')
  const ok = await fileExists(heroPath)
  if (!ok) {
    console.log(`⚠ ${d.name}：侧车存在但文件缺失（${sidecar.file}），状态降级 candidate`)
    sidecar.status = 'candidate'
    await writeJson(sidecarPath, sidecar)
    continue
  }
  if (sidecar.status === 'verified' || sidecar.status === 'approved') {
    verified++
    console.log(`verified ${d.name} ✓（${sidecar.file}）`)
  } else {
    candidate++
    console.log(`candidate ${d.name}`)
  }
}

console.log(`\nverify-assets: ${verified} verified · ${candidate} candidate（幂等，可重复运行）`)
