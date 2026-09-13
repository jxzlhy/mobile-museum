// 阶段 2 · 候选下载（V0.2.5 §8 / §12 / §21）
// 用法: node scripts/download-assets.mjs [--only id1,id2]
// 读取 scripts/assets-candidates.json，把最佳候选下载并处理为：
//   public/phones/<id>/hero.webp (1200) + hero.thumb.webp (480) + 原始档 raw.*
//   + asset.json 侧车（status:'verified'，含来源/作者/许可证）。
// 幂等：已有 verified/approved 侧车的设备跳过。单台失败记录后继续（§21）。

import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  PUBLIC_PHONES_DIR, CANDIDATES_FILE, downloadTo, makeVariant, readJson, writeJson,
  fileExists, onlyFilter, recordError,
} from './lib/assets-common.mjs'

const onlyIdx = process.argv.indexOf('--only')
const ONLY = onlyIdx > -1 ? process.argv[onlyIdx + 1]?.split(',').map((s) => s.trim()) : null

const candidatesFile = await readJson(CANDIDATES_FILE, {})
const ids = ONLY ?? Object.keys(candidatesFile)

let ok = 0
for (const id of ids) {
  const entry = candidatesFile[id]
  if (!entry || entry.status !== 'candidate' || entry.candidates?.length === 0) {
    console.log(`skip ${id}（无候选或状态非 candidate）`)
    continue
  }
  const dir = path.join(PUBLIC_PHONES_DIR, id)
  const sidecarPath = path.join(dir, 'asset.json')
  if (await fileExists(sidecarPath)) {
    const sidecar = await readJson(sidecarPath, {})
    if (sidecar.status === 'verified' || sidecar.status === 'approved') {
      console.log(`skip ${id}（已下载并核验，幂等）`)
      continue
    }
  }

  process.stdout.write(`download ${id} … `)
  const best = entry.candidates[0]
  try {
    await mkdir(dir, { recursive: true })
    const ext = /\.png$/i.test(best.title) ? 'png' : 'jpg'
    const rawPath = path.join(dir, `raw.${ext}`)
    await downloadTo(best.url, rawPath)

    const heroFile = makeVariant(rawPath, path.join(dir, 'hero.webp'), 1200)
    if (!heroFile) throw new Error('图片处理失败（sips）')
    const thumbFile = makeVariant(rawPath, path.join(dir, 'hero.thumb.webp'), 480) ?? heroFile

    const sidecar = {
      status: 'verified',
      angle: 'hero',
      file: heroFile,
      thumb: thumbFile,
      raw: `raw.${ext}`,
      source: {
        type: 'wikimedia-commons',
        url: best.pageUrl,
        title: best.title,
        author: best.author,
        license: best.license,
        licenseUrl: best.licenseUrl,
        attribution: best.title,
      },
      verifiedAt: new Date().toISOString(),
      note: '来源/许可证已经 Commons API 元数据核验；图片本体经人工复核后可 approve。',
    }
    await writeJson(sidecarPath, sidecar)
    ok++
    console.log(`✓ ${heroFile} [${best.license}] ${best.author}`)
  } catch (e) {
    console.log(`✗ ${e.message}`)
    await recordError('download-assets', id, e.message)
  }
}

console.log(`\ndownload-assets: ${ok} 台完成 → public/phones/`)
