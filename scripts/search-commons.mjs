// 阶段 1b · Commons 图片候选发现（V0.2.6 §4–§15 / §24）
// 用法:
//   npm run assets:discover -- --debug
//   npm run assets:discover -- --phones=nokia-3310,apple-iphone --debug
// 行为:
//   1. [NETWORK] 健康检查（Commons / Wikidata / WDQS）——失败输出 NETWORK_BLOCKED，
//      绝不把网络失败伪装成 missing（§5 / §24）。
//   2. normalizePhoneName：brand / model / displayName 分解（§8）。
//   3. 多级 Query（§7）逐条执行，--debug 打印每条 HTTP 状态与结果数（§9）。
//   4. 候选评分排名（§13）：+型号精确匹配 +品牌 +phone 关键词 +分辨率 +许可证；
//      − 附件/包装/手册/截图（§14）。
//   5. 错误分类（§24）：NETWORK_BLOCKED / API_ERROR / API_EMPTY / NO_RESULTS。
// 输出: scripts/assets-candidates.json（status: candidate / missing / NETWORK_BLOCKED …）
// 幂等：已有候选未加 --refresh 跳过；已 approved 跳过。

import {
  TARGETS, CANDIDATES_FILE, LICENSE_OK, stripHtml, scoreTitle, readJson, writeJson,
  onlyFilter, searchCommons, recordError,
} from './lib/assets-common.mjs'

const argv = process.argv.slice(2)
const refresh = argv.includes('--refresh')
const debug = argv.includes('--debug')
const phonesIdx = argv.indexOf('--phones')
const ONLY = phonesIdx > -1 ? argv[phonesIdx + 1]?.split(',').map((s) => s.trim()) : null

/** 名称规范化（§8）：保留 brand / model / displayName。 */
export function normalizePhoneName(name, brand) {
  const displayName = String(name).replace(/\s+/g, ' ').trim()
  let rest = displayName
  if (brand && rest.toLowerCase().startsWith(brand.toLowerCase())) {
    rest = rest.slice(brand.length).trim()
  }
  return { brand: brand ?? '', model: rest, displayName }
}

/** 多级 Query（§7）：Q1 原名 → Q2 +mobile phone → Q3 +phone → Q4 括号形式 → Q5 仅型号。 */
function buildQueries(seed) {
  const { brand, model, displayName } = normalizePhoneName(seed.name, seed.brand)
  const q = [displayName]
  if (model && model !== displayName) q.push(model)
  q.push(`${displayName} mobile phone`)
  q.push(`${displayName} phone`)
  if (brand && model) q.push(`${brand} ${model}`)
  return [...new Set(q)]
}

// ---- [NETWORK] 健康检查（§5）----
async function healthCheck() {
  const probe = async (name, url) => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': UA } })
      return { name, ok: r.ok, status: r.status }
    } catch (e) {
      return { name, ok: false, status: 0, error: String(e).slice(0, 80) }
    }
  }
  console.log('[NETWORK]')
  const results = await Promise.all([
    probe('Commons', 'https://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&format=json'),
    probe('Wikidata', 'https://www.wikidata.org/w/api.php?action=query&meta=siteinfo&format=json'),
    probe('WDQS', 'https://query.wikidata.org/sparql?query=SELECT%20?x%20WHERE%20{}&format=json'),
  ])
  for (const r of results) {
    console.log(`${r.name}: ${r.ok ? 'OK' : 'FAILED'}${r.ok ? '' : ` (${r.status} ${r.error ?? ''})`}`)
  }
  const blocked = results.some((r) => !r.ok)
  if (blocked) console.log('\nNETWORK_BLOCKED —— 网络失败不等于 missing（§5/§24）')
  return { blocked, commonsOk: results[0].ok }
}

// §13 评分 + §14 附件排除
const EXCLUDE = /(box|manual|charger|case\)|advertis|screenshot|logo|parts only|package|packaging|booklet|instruction)/i
function rankCandidate(c, seed) {
  const t = c.title.toLowerCase()
  let s = 0
  if (seed.model && t.includes(seed.model.toLowerCase())) s += 3
  if (seed.brand && t.includes(seed.brand.toLowerCase())) s += 1
  if (/phone|mobile/.test(t)) s += 1
  if ((c.width ?? 0) >= 1000) s += 1
  if (c.license && LICENSE_OK.test(c.license)) s += 1
  if (/front|back|side|black|blue|white|grey|gray|red/.test(t)) s += 0.5
  return Number(s.toFixed(1))
}

import { UA } from './lib/assets-common.mjs'

const targets = onlyFilter(argv, TARGETS)
const health = await healthCheck()
if (health.blocked && targets.length > 0) {
  console.log('\n中止发现：网络不可用。请检查代理后重试（本阶段不把任何设备标记为 missing）。')
  const previous = await readJson(CANDIDATES_FILE, {})
  for (const t of targets) {
    previous[t.id] = previous[t.id] ?? { status: 'NETWORK_BLOCKED', candidates: [], updatedAt: new Date().toISOString() }
  }
  await writeJson(CANDIDATES_FILE, previous)
  process.exit(2)
}

const previous = await readJson(CANDIDATES_FILE, {})
const manifest = await readJson(new URL('../src/data/assets/assets-manifest.json', import.meta.url), { phones: {} })
const result = { ...previous }
let found = 0
let candidateCount = 0

for (const t of targets) {
  if (manifest.phones?.[t.id]?.hero?.status === 'approved') {
    console.log(`skip ${t.id}（已 approved，幂等）`)
    continue
  }
  if (!refresh && (previous[t.id]?.candidates?.length ?? 0) > 0) {
    console.log(`skip ${t.id}（已有候选，幂等；--refresh 重查）`)
    continue
  }

  const { brand, model } = normalizePhoneName(t.name, t.queries[0].split(' ')[0])
  const seed = { name: t.name, brand: t.name.split(' ')[0], model }
  const queries = buildQueries({ name: t.name, brand: seed.brand })
  if (debug) {
    console.log('========================================')
    console.log(`PHONE: ${t.name}\nID: ${t.id}`)
    console.log('========================================')
  }

  const candidates = []
  let networkError = false
  let apiError = false
  let qi = 0
  for (const q of queries) {
    qi++
    try {
      if (debug) process.stdout.write(`[COMMONS QUERY ${qi}] ${q} … `)
      const pages = await searchCommons(q)
      const list = Object.values(pages)
      if (debug) console.log(`HTTP 200 · Results: ${list.length}`)
      for (const page of list) {
        const info = page.imageinfo?.[0]
        const title = page.title ?? ''
        if (!info || !/\.(jpe?g|png)$/i.test(title)) continue
        if ((info.width ?? 0) < 700) continue
        const meta = info.extmetadata ?? {}
        const license = stripHtml(meta.LicenseShortName?.value)
        if (!LICENSE_OK.test(license)) continue // LICENSE_UNKNOWN → 不入候选（§13/§19）
        if (EXCLUDE.test(title)) {
          if (debug) console.log(`  excluded(附件/包装): ${title}`)
          continue
        }
        candidates.push({
          phoneId: t.id, title,
          url: info.thumburl ?? info.url,
          descriptionUrl: info.descriptionurl,
          width: info.width, height: info.height,
          author: stripHtml(meta.Artist?.value) || '未知作者',
          license, licenseUrl: stripHtml(meta.LicenseUrl?.value),
          score: rankCandidate({ title, width: info.width, license }, seed),
          status: 'candidate',
          source: { type: 'wikimedia-commons', url: info.descriptionurl },
        })
      }
    } catch (e) {
      networkError = true
      if (debug) console.log(`NETWORK_ERROR: ${String(e).slice(0, 80)}`)
      await recordError('search-commons', t.id, e.message)
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  const uniq = candidates.filter(
    (c, i, arr) => arr.findIndex((x) => x.title === c.title) === i,
  )
  result[t.id] = {
    status: networkError ? 'NETWORK_BLOCKED' : uniq.length > 0 ? 'candidate' : 'NO_RESULTS',
    candidates: uniq.slice(0, 5),
    updatedAt: new Date().toISOString(),
  }
  if (uniq.length > 0) {
    found++
    candidateCount += uniq.length
    console.log(`${t.id}: ${uniq.length} 候选（最高分 ${uniq[0].score} → ${uniq[0].title}）`)
    if (debug) {
      uniq.slice(0, 5).forEach((c, i) =>
        console.log(`  ${i + 1}. [${c.score}] ${c.title} | ${c.license} | ${c.width}×${c.height} | ${c.author.slice(0, 30)}`),
      )
    }
  } else if (!networkError) {
    console.log(`${t.id}: NO_RESULTS（Commons 可达但无合规候选，可标 missing 或按 §25 替换）`)
  }
}

await writeJson(CANDIDATES_FILE, result)
console.log(`\nsearch-commons: ${found}/${targets.length} 台发现候选 · 共 ${candidateCount} 个候选 → scripts/assets-candidates.json`)
