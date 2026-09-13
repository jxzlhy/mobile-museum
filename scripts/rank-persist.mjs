// V0.2.7 §10：候选评分与持久化。
// 用法: node scripts/rank-persist.mjs <raw-discovery.json>
// 读浏览器/脚本产出的原始候选（每台 ≤N 条），按 §10 评分规则排名：
//   Exact Model Match +100 · Preferred Alias +80 · Brand Match +30
//   Year Match +20 · Generic Phone Match +5
//   Excluded Generation/Wrong Brand/附件 −100
// 分级：>=100 strong · 60–99 candidate · 20–59 weak · <20 reject
// 输出: scripts/assets-candidates.json（供 assets:download / build / report 使用）

import { readJson, writeJson } from './lib/assets-common.mjs'
import rules from '../src/data/assets/match-rules.json' with { type: 'json' }

const rawFile = process.argv[2]
const force = process.argv.includes('--force')
if (!rawFile) {
  console.error('用法: node scripts/rank-persist.mjs <raw-discovery.json>')
  process.exit(1)
}

const raw = await readJson(rawFile, {})
const existing = await readJson(new URL('./assets-candidates.json', import.meta.url), {})

const EXCLUDE_TERMS = /(box|manual|charger|case\)|advertis|screenshot|logo|parts only|package|packaging|booklet|instruction|bumper|teardown|removed|disassembl|repair|comparison|launch event|keynote|holding|hands on|psd|mock|kindle|otg|no shadow)/i

function scoreCandidate(c, rule, year) {
  const t = c.title.toLowerCase()
  let score = 0
  const reasons = []
  if (rule) {
    for (const inc of rule.i) {
      if (t.includes(inc.toLowerCase())) {
        score += 100
        reasons.push(`exact:${inc} +100`)
        break
      }
    }
    for (const p of rule.p) {
      if (t.includes(p.toLowerCase())) {
        score += 80
        reasons.push(`preferred:${p} +80`)
        break
      }
    }
    for (const e of rule.e) {
      if (t.includes(e.toLowerCase())) {
        score -= 100
        reasons.push(`excluded-gen:${e} -100`)
        break
      }
    }
  }
  if (rule && /phone|mobile|communicator/.test(t)) {
    score += 5
    reasons.push('generic +5')
  }
  if (year && t.includes(String(year))) {
    score += 20
    reasons.push(`year:${year} +20`)
  }
  if (EXCLUDE_TERMS.test(t)) {
    score -= 100
    reasons.push('accessory -100')
  }
  if ((c.width ?? 0) >= 900) reasons.push('resolution ✓')
  return { score, reasons }
}

const out = { ...existing }
let strong = 0
let candidate = 0
let weak = 0
let rejected = 0

for (const [phoneId, entry] of Object.entries(raw)) {
  const year = entry.phone?.year
  const rule = rules[phoneId]
  const ranked = (entry.candidates ?? []).map((c) => {
    const { score, reasons } = scoreCandidate(c, rule, year)
    return { ...c, score, reasons }
  })
  ranked.sort((a, b) => b.score - a.score)
  const top = ranked[0]
  let status = 'missing'
  if (top) {
    if (top.score >= 100) { status = 'candidate'; strong++ }
    else if (top.score >= 60) { status = 'candidate'; candidate++ }
    else if (top.score >= 20) { status = 'weak'; weak++ }
    else { status = 'rejected'; rejected++ }
  }
  // 保留旧候选中已有高分结果（幂等：不被低分新结果覆盖）
  const prev = existing[phoneId]
  const prevTop = prev?.candidates?.[0]
  if (!force && prevTop && (prevTop.score ?? 0) >= (top?.score ?? 0) && prev.status !== 'missing') {
    out[phoneId] = prev
    console.log(`keep ${phoneId}（既有高分候选 ${prevTop.score}）`)
    continue
  }
  out[phoneId] = {
    status: status === 'weak' ? 'candidate' : status,
    tier: top ? (top.score >= 100 ? 'strong' : top.score >= 60 ? 'candidate' : top.score >= 20 ? 'weak' : 'reject') : 'missing',
    candidates: ranked.slice(0, 5),
    updatedAt: new Date().toISOString(),
  }
  if (debug()) console.log(`\nPHONE: ${entry.phone?.name ?? phoneId}\nID: ${phoneId}`)
  if (debug()) {
    ranked.slice(0, 5).forEach((c, i) =>
      console.log(`${String(i + 1).padStart(2, '0')} score=${c.score}  ${c.title}\n   ${c.reasons.join(' · ')}`),
    )
  }
}

function debug() {
  return process.argv.includes('--debug')
}

await writeJson(new URL('./assets-candidates.json', import.meta.url), out)

const ids = Object.entries(out)
console.log(`\nrank-persist: strong ${strong} · candidate ${candidate} · weak ${weak} · reject ${rejected}`)
console.log('top phones:')
ids
  .filter(([, v]) => v.candidates?.length > 0)
  .sort((a, b) => (b[1].candidates[0]?.score ?? 0) - (a[1].candidates[0]?.score ?? 0))
  .slice(0, 25)
  .forEach(([id, v]) => console.log(`  ${id}: ${v.candidates.length} 个 · 最高分 ${v.candidates[0].score} → ${v.candidates[0].title.slice(0, 60)}`))
