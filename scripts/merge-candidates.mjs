// 离线发现预写 · 把人工核实的候选条目合并进 assets-candidates.json（幂等）
// 来源：web_reader 抓取的 Commons 分类页 + 文件页（og:image 即下载 URL）。
// 用法: node scripts/merge-candidates.mjs < batches.json
// batches.json 格式: { "<phoneId>": { "title": "...", "url": "https://upload.../1920px-...", "pageUrl": "https://commons.wikimedia.org/wiki/File:...", "author": "...", "license": "...", "licenseUrl": "..." }[] }
// 手机 id → 候选数组（candidates[0] = 最佳，download-assets.mjs 依序取用）。

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const FILE = path.resolve(import.meta.dirname, 'assets-candidates.json')

const batchFile = process.argv[2]
if (!batchFile) {
  console.error('用法: node scripts/merge-candidates.mjs < batches.json')
  process.exit(1)
}

const batch = JSON.parse(await readFile(batchFile, 'utf8'))
const cur = JSON.parse(await readFile(FILE, 'utf8'))

let added = 0
let replaced = 0
for (const [id, list] of Object.entries(batch)) {
  if (!Array.isArray(list) || list.length === 0) continue
  const entries = list.map((c) => ({
    status: 'candidate',
    title: c.title,
    url: c.url,
    descriptionUrl: c.pageUrl,
    source: { type: 'wikimedia-commons', url: c.pageUrl },
    author: c.author ?? '',
    license: c.license ?? '',
    licenseUrl: c.licenseUrl ?? '',
  }))
  if (cur[id]?.status === 'candidate' && cur[id].candidates?.length) replaced++
  cur[id] = { status: 'candidate', candidates: entries }
  added++
}

await writeFile(FILE, JSON.stringify(cur, null, 2) + '\n')
console.log(`合并完成：${added} 台设备写入候选（覆盖已有 ${replaced} 台），总设备数 ${Object.keys(cur).length}`)
