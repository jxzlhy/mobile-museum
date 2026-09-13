// 人工审批（V0.2.5 §5 状态机）：candidate/verified → approved
// 用法:
//   node scripts/approve-assets.mjs --id nokia-3210 [--angle hero]
//   node scripts/approve-assets.mjs --all          （批准全部 verified）
// 审核标准（§10）：设备完整、型号可确认、清晰、许可证明确。
// 批准后运行 assets:build 刷新 manifest 与报告。

import path from 'node:path'
import {
  PUBLIC_PHONES_DIR, MANIFEST_FILE, readJson, writeJson, fileExists,
} from './lib/assets-common.mjs'

const argv = process.argv.slice(2)
const idIdx = argv.indexOf('--id')
const all = argv.includes('--all')
const angleIdx = argv.indexOf('--angle')
const angle = angleIdx > -1 ? argv[angleIdx + 1] : 'hero'

if (!all && idIdx === -1) {
  console.error('用法: node scripts/approve-assets.mjs --id <phoneId> [--angle hero] | --all')
  process.exit(1)
}

const manifest = await readJson(MANIFEST_FILE, { phones: {} })

async function approve(phoneId, ang) {
  const sidecarPath = path.join(PUBLIC_PHONES_DIR, phoneId, 'asset.json')
  if (await fileExists(sidecarPath)) {
    const sidecar = await readJson(sidecarPath, {})
    if (sidecar.status === 'candidate' || sidecar.status === 'verified') {
      sidecar.status = 'approved'
      sidecar.approvedAt = new Date().toISOString()
      await writeJson(sidecarPath, sidecar)
    }
  }
  const entry = manifest.phones?.[phoneId]?.[ang]
  if (entry && (entry.status === 'verified' || entry.status === 'candidate')) {
    entry.status = 'approved'
    entry.approvedAt = new Date().toISOString()
    console.log(`✓ approved ${phoneId} [${ang}]`)
    return true
  }
  console.log(`⚠ ${phoneId} [${ang}] 不存在或状态不可批准`)
  return false
}

let n = 0
if (all) {
  for (const [phoneId, assets] of Object.entries(manifest.phones ?? {})) {
    if (assets.hero && (await approve(phoneId, 'hero'))) n++
  }
} else {
  const phoneId = argv[idIdx + 1]
  n = (await approve(phoneId, angle)) ? 1 : 0
}

await writeJson(MANIFEST_FILE, manifest)
console.log(`\napprove-assets: ${n} 项 → 运行 npm run assets:build 刷新报告`)
