// 轮次9 · 署名元数据回填：sidecar.source 补 url/author/license/licenseUrl
// 数据来源：web_reader 抓取的 Commons 文件页（scripts/metadata-backfill-notes.json 内嵌）。
// url 字段可离线推导（Commons 文件页 = title 编码）；license/author 来自已抓页面。
// 用法: node scripts/backfill-attribution.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = path.resolve(import.meta.dirname, '..', 'public', 'phones')

// 已核实的署名（web_reader 实抓，2026-11-14）
const VERIFIED = {
  'apple-iphone-3g': { author: 'Feureau', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'apple-iphone-4': { author: 'iGeeksBlog', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'apple-iphone-5s': { author: 'Zach Vega', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' },
  'apple-iphone-x': { author: 'Gregory Varnum', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'blackberry-bold-9000': { license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'blackberry-curve-8520': { author: 'Klaeiis', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'htc-dream': { author: 'Marcus Sümnick', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  'huawei-p20-pro': { author: 'Kārlis Dambrāns', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'lg-g3': { author: 'LG Electronics (Flickr)', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/' },
  'motorola-microtac': { author: 'Redrum0486', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', note: '多重许可' },
  'motorola-razr-v3': { author: 'Raimond Spekking', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'motorola-startac': { author: 'Rainer P. A. Wermke (Banffy)', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'nokia-1011': { author: 'Jkbw', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/', note: '多重许可（仅 attribution）' },
  'nokia-2110': { author: 'Mustaraamattu', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'nokia-3210': { author: 'Michael Brandtner (Discostu)', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/Template:PD-self', note: '作者释放至公有领域' },
}

// verified 复审（轮次9）：两张低于馆藏标准 → 正式拒绝
const REJECT = {
  'apple-iphone-6': '复审拒绝：硅胶套遮挡机身设计，屏幕停在 iOS 更新进度条，非展品照',
  'samsung-galaxy-note': '复审拒绝：熄屏 + 大面积灯光反光 + 桌面背景，快照级低于馆藏标准',
}

let urlFilled = 0
let attrFilled = 0
let rejected = 0
const dirs = (await readdir(BASE, { withFileTypes: true })).filter((d) => d.isDirectory())

for (const d of dirs) {
  const sidecarPath = path.join(BASE, d.name, 'asset.json')
  let raw
  try {
    raw = await readFile(sidecarPath, 'utf8')
  } catch {
    continue
  }
  const sidecar = JSON.parse(raw)
  let changed = false

  // ---- 复审拒绝 ----
  if (REJECT[d.name] && sidecar.status === 'verified') {
    sidecar.status = 'rejected'
    sidecar.note = REJECT[d.name]
    await writeFile(sidecarPath, JSON.stringify(sidecar, null, 2) + '\n')
    rejected++
    console.log(`rejected: ${d.name} — ${REJECT[d.name]}`)
    continue
  }

  const src = sidecar.source
  if (!src) continue

  // ---- url：文件页链接可从 title 推导 ----
  if (!src.url && src.title?.startsWith('File:')) {
    src.url = 'https://commons.wikimedia.org/wiki/' + encodeURI(src.title.replaceAll(' ', '_'))
    changed = true
    urlFilled++
  }

  // ---- 署名：来自已核实的抓取结果 ----
  const v = VERIFIED[d.name]
  if (v) {
    if (!src.author && v.author) {
      src.author = v.author
      changed = true
    }
    if (!src.license && v.license) {
      src.license = v.license
      changed = true
    }
    if (!src.licenseUrl && v.licenseUrl) {
      src.licenseUrl = v.licenseUrl
      changed = true
    }
    if (changed) attrFilled++
  }

  if (changed) await writeFile(sidecarPath, JSON.stringify(sidecar, null, 2) + '\n')
}

console.log(`\n完成：url 回填 ${urlFilled} 个，署名回填 ${attrFilled} 个，复审拒绝 ${rejected} 个`)
