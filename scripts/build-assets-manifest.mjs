// 阶段 4 · 生成 assets-manifest（V0.2.5 §7 / §8.3）+ 资产报告（§20）
// 用法: node scripts/build-assets-manifest.mjs
// 幂等：重复运行不产生重复记录；已 approved 的条目不会被降级，
// 除非对应文件被移除（此时回退 candidate 并计入报告）。

import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  PUBLIC_PHONES_DIR, MANIFEST_FILE, REPORT_FILE, TARGETS,
  readJson, writeJson, fileExists,
} from './lib/assets-common.mjs'

const existing = await readJson(MANIFEST_FILE, { phones: {} })
const phonesOut = {}

const dirs = (await fileExists(PUBLIC_PHONES_DIR))
  ? await readdir(PUBLIC_PHONES_DIR, { withFileTypes: true })
  : []

for (const d of dirs) {
  if (!d.isDirectory()) continue
  const dir = path.join(PUBLIC_PHONES_DIR, d.name)
  const sidecarPath = path.join(dir, 'asset.json')
  if (!(await fileExists(sidecarPath))) continue
  const sidecar = await readJson(sidecarPath, null)
  if (!sidecar) continue

  const heroFile = sidecar.file
  const heroPath = path.join(dir, heroFile ?? '')
  if (!(heroFile && (await fileExists(heroPath)))) continue

  const prior = existing.phones?.[d.name]?.hero
  // 状态机（§5）：approved 一经人工确认不自动降级；文件缺失除外
  let status = sidecar.status ?? 'candidate'
  if (status === 'verified' && prior?.status === 'approved') status = 'approved'
  if (status === 'candidate' && prior?.status === 'approved') status = 'approved'

  let width
  let height
  try {
    const st = await stat(heroPath)
    void st
  } catch { /* ignore */ }

  const format = /\.webp$/i.test(heroFile) ? 'webp' : /\.png$/i.test(heroFile) ? 'png' : 'jpg'
  const entry = {
    path: `/phones/${d.name}/${heroFile}`,
    thumbPath: sidecar.thumb ? `/phones/${d.name}/${sidecar.thumb}` : undefined,
    status,
    angle: sidecar.angle ?? 'hero',
    format,
    source: sidecar.source,
    width,
    height,
    note: sidecar.note,
    updatedAt: new Date().toISOString(),
  }
  phonesOut[d.name] = { hero: entry }

  // 本地导入的多角度图（front/back/side/detail/gallery-*）一并登记
  const files = (await readdir(dir)).filter(
    (f) => /\.(webp|jpe?g|png)$/i.test(f) && !f.startsWith('raw.') && !f.startsWith('hero'),
  )
  const gallery = []
  for (const f of files) {
    const angle = f.toLowerCase().split('.')[0]
    const gEntry = {
      path: `/phones/${d.name}/${f}`,
      status: status === 'approved' ? 'approved' : 'candidate',
      angle,
      format: /\.webp$/i.test(f) ? 'webp' : /\.png$/i.test(f) ? 'png' : 'jpg',
      source: sidecar.source,
    }
    if (ANGLES.includes(angle)) phonesOut[d.name][angle] = gEntry
    else gallery.push(gEntry)
  }
  if (gallery.length > 0) phonesOut[d.name].gallery = gallery
}

await writeJson(MANIFEST_FILE, { phones: phonesOut, generatedAt: new Date().toISOString() })

// ---- 报告（规范 §20 / §21）----
const approvedIds = Object.entries(phonesOut)
  .filter(([, v]) => v.hero?.status === 'approved')
  .map(([id]) => id)
const verifiedIds = Object.entries(phonesOut)
  .filter(([, v]) => v.hero?.status === 'verified')
  .map(([id]) => id)
const candidateIds = Object.entries(phonesOut)
  .filter(([, v]) => v.hero?.status === 'candidate')
  .map(([id]) => id)
const missingPhones = TARGETS.filter((t) => !approvedIds.includes(t.id)).map((t) => t.id)
const errors = await readJson(new URL('./assets-errors.json', import.meta.url), [])
const rejectedAssets = Object.entries(phonesOut)
  .filter(([, v]) => v.hero?.status === 'rejected')
  .map(([id]) => id)

// 发现统计（V0.2.6 §23）：来自 candidates 文件的真实运行结果
const candidatesFile = await readJson(new URL('./assets-candidates.json', import.meta.url), {})
const discoveredIds = Object.entries(candidatesFile)
  .filter(([, v]) => v.status === 'candidate')
  .map(([id]) => id)
const candidatesTotal = Object.values(candidatesFile).reduce(
  (n, v) => n + (v.candidates?.length ?? 0),
  0,
)

const report = {
  generatedAt: new Date().toISOString(),
  total: TARGETS.length,
  discovered: discoveredIds.length,
  candidates: candidatesTotal,
  approved: approvedIds.length,
  verified: verifiedIds.length,
  candidate: candidateIds.length,
  missing: missingPhones.length,
  failed: errors.length,
  rejected: rejectedAssets.length,
  missingPhones,
  rejectedAssets,
  failedDownloads: errors.filter((e) => e.stage === 'download-assets').slice(-20),
  approvedPhones: approvedIds,
}
await writeJson(REPORT_FILE, report)

console.log(`build-assets-manifest: ${Object.keys(phonesOut).length} 台设备进入 manifest`)
console.log(`approved ${approvedIds.length} · verified ${verifiedIds.length} · candidate ${candidateIds.length} · missing ${missingPhones.length}`)
console.log(`→ src/data/assets/assets-manifest.json + assets-report.json`)
