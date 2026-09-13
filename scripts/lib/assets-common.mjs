// MOBILE MUSEUM — 资产管线共享库（V0.2.5 §6 / §8 / §13）
// 被 fetch-wikidata / search-commons / download-assets / verify-assets /
// build-assets-manifest / approve-assets 六个阶段脚本复用。

import { readFile, writeFile, access } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

export const ROOT = path.resolve(process.cwd())
export const PUBLIC_PHONES_DIR = path.join(ROOT, 'public', 'phones')
export const CANDIDATES_FILE = path.join(ROOT, 'scripts', 'assets-candidates.json')
export const ERRORS_FILE = path.join(ROOT, 'scripts', 'assets-errors.json')
export const MANIFEST_FILE = path.join(ROOT, 'src', 'data', 'assets', 'assets-manifest.json')
export const REPORT_FILE = path.join(ROOT, 'assets-report.json')
export const UA = 'MobileMuseumAssetPipeline/0.2.5 (local development; contact: museum dev team)'

export const LICENSE_OK = /(cc0|cc by(-sa)?( \d|\d)|public domain|^pd|pd-|no restrictions)/i

/** 管线目标清单（规范 §9 第一批，映射到本项目 50 台数据集）。 */
export const TARGETS = [
  { id: 'motorola-dynatac-8000x', queries: ['Motorola DynaTAC 8000X'] },
  { id: 'motorola-dynatac-prototype', queries: ['Motorola DynaTAC prototype', 'Martin Cooper DynaTAC'] },
  { id: 'motorola-microtac', queries: ['Motorola MicroTAC'] },
  { id: 'motorola-startac', queries: ['Motorola StarTAC'] },
  { id: 'motorola-razr-v3', queries: ['Motorola RAZR V3'] },
  { id: 'motorola-milestone', queries: ['Motorola Milestone', 'Motorola Droid'] },
  { id: 'motorola-razr-2019', queries: ['Motorola Razr 2019', 'Motorola Razr foldable'] },
  { id: 'nokia-1011', queries: ['Nokia 1011'] },
  { id: 'nokia-2110', queries: ['Nokia 2110'] },
  { id: 'nokia-8110', queries: ['Nokia 8110'] },
  { id: 'nokia-9000-communicator', queries: ['Nokia 9000 Communicator'] },
  { id: 'nokia-3210', queries: ['Nokia 3210'] },
  { id: 'nokia-3310', queries: ['Nokia 3310'] },
  { id: 'nokia-ngage', queries: ['Nokia N-Gage'] },
  { id: 'nokia-n95', queries: ['Nokia N95'] },
  { id: 'nokia-n9', queries: ['Nokia N9'] },
  { id: 'nokia-lumia-920', queries: ['Nokia Lumia 920'] },
  { id: 'ibm-simon', queries: ['IBM Simon Personal Communicator', 'IBM Simon phone'] },
  { id: 'sharp-j-sh04', queries: ['Sharp J-SH04'] },
  { id: 'siemens-s10', queries: ['Siemens S10 phone', 'Siemens S10'] },
  { id: 'sony-ericsson-k750i', queries: ['Sony Ericsson K750i'] },
  { id: 'sony-ericsson-w800i', queries: ['Sony Ericsson W800i'] },
  { id: 'sony-xperia-1', queries: ['Sony Xperia 1'] },
  { id: 'blackberry-bold-9000', queries: ['BlackBerry Bold 9000'] },
  { id: 'blackberry-curve-8520', queries: ['BlackBerry Curve 8520'] },
  { id: 'htc-dream', queries: ['HTC Dream', 'T-Mobile G1'] },
  { id: 'htc-one-m7', queries: ['HTC One M7', 'HTC One 2013'] },
  { id: 'apple-iphone', queries: ['IPhone (1st generation)', 'iPhone 2G'] },
  { id: 'apple-iphone-3g', queries: ['IPhone 3G'] },
  { id: 'apple-iphone-4', queries: ['IPhone 4'] },
  { id: 'apple-iphone-5s', queries: ['IPhone 5S'] },
  { id: 'apple-iphone-6', queries: ['IPhone 6'] },
  { id: 'apple-iphone-x', queries: ['IPhone X'] },
  { id: 'apple-iphone-12', queries: ['IPhone 12'] },
  { id: 'apple-iphone-15-pro', queries: ['IPhone 15 Pro'] },
  { id: 'samsung-galaxy-s', queries: ['Samsung Galaxy S i9000', 'Samsung Galaxy S (2010)'] },
  { id: 'samsung-galaxy-note', queries: ['Samsung Galaxy Note (original)', 'Samsung Galaxy Note N7000'] },
  { id: 'samsung-galaxy-s6-edge', queries: ['Samsung Galaxy S6 Edge'] },
  { id: 'samsung-galaxy-fold', queries: ['Samsung Galaxy Fold'] },
  { id: 'samsung-galaxy-z-flip', queries: ['Samsung Galaxy Z Flip'] },
  { id: 'google-pixel', queries: ['Google Pixel (2016)', 'Pixel XL'] },
  { id: 'xiaomi-mi-1', queries: ['Xiaomi Mi 1 phone', 'Xiaomi Mi-One'] },
  { id: 'xiaomi-mi-mix', queries: ['Xiaomi Mi MIX'] },
  { id: 'huawei-p20-pro', queries: ['Huawei P20 Pro'] },
  { id: 'oppo-find-x', queries: ['Oppo Find X'] },
  { id: 'vivo-nex', queries: ['Vivo NEX'] },
  { id: 'lg-chocolate-kg90', queries: ['LG Chocolate KG90', 'LG Chocolate phone'] },
  { id: 'lg-g3', queries: ['LG G3'] },
]

export function stripHtml(s) {
  return String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

export function scoreTitle(title, query) {
  const t = title.toLowerCase()
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)
  if (words.length === 0) return 0
  let hit = 0
  for (const w of words) if (t.includes(w)) hit++
  return hit / words.length + (t.includes(query.toLowerCase()) ? 3 : 0)
}

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

export async function writeJson(file, data) {
  await writeFile(file, JSON.stringify(data, null, 2))
}

export async function fileExists(p) {
  try { await access(p); return true } catch { return false }
}

function sips(args) {
  try {
    execFileSync('sips', args, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/** 生成 webp 版本（失败回退原格式），返回最终文件名或 null。 */
export function makeVariant(rawPath, outPath, size) {
  if (sips(['-s', 'format', 'webp', '-Z', String(size), rawPath, '--out', outPath])) {
    return path.basename(outPath)
  }
  const ext = path.extname(rawPath)
  if (sips(['-Z', String(size), rawPath, '--out', outPath.replace(/\.webp$/, ext)])) {
    return path.basename(outPath).replace(/\.webp$/, ext)
  }
  return null
}

/** Commons 检索（返回带许可证元数据的候选页）。 */
export async function searchCommons(query, limit = 12) {
  const u = new URL('https://commons.wikimedia.org/w/api.php')
  u.searchParams.set('action', 'query')
  u.searchParams.set('format', 'json')
  u.searchParams.set('generator', 'search')
  u.searchParams.set('gsrsearch', query)
  u.searchParams.set('gsrnamespace', '6')
  u.searchParams.set('gsrlimit', String(limit))
  u.searchParams.set('prop', 'imageinfo')
  u.searchParams.set('iiprop', 'url|size|mime|extmetadata')
  u.searchParams.set('iiurlwidth', '1400')
  const res = await fetch(u, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  const j = await res.json()
  return Object.values(j?.query?.pages ?? {})
}

/** 下载文件（走系统网络）。 */
export async function downloadTo(url, filePath) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`)
  const { writeFile } = await import('node:fs/promises')
  await writeFile(filePath, Buffer.from(await res.arrayBuffer()))
}

export function onlyFilter(argv, targets) {
  const i = argv.indexOf('--only')
  if (i > -1) {
    const ids = argv[i + 1]?.split(',').map((s) => s.trim())
    return targets.filter((t) => ids.includes(t.id))
  }
  return targets
}

/** 记录失败（§21：单点失败不中止管线）。 */
export async function recordError(stage, phoneId, message) {
  const errors = await readJson(ERRORS_FILE, [])
  errors.push({ stage, phoneId, message, at: new Date().toISOString() })
  await writeJson(ERRORS_FILE, errors.slice(-200))
}
