// V1.0 内容审计（规范 §9–§10 / §13）：重复 ID / 坏引用 / 年份 / 缺来源
// 用法: node scripts/audit-content.mjs → reports/content-report.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const manifest = JSON.parse(readFileSync('src/data/assets/assets-manifest.json', 'utf8'))
const mod = (p) => import('../' + p)
const src = (p) => readFileSync(p, 'utf8')

const report = { total: 0, valid: 0, invalid: 0, missing: 0, broken: 0, issues: [] }
const issue = (kind, detail) => {
  report.issues.push({ kind, detail })
  if (kind === 'BROKEN' || kind === 'INVALID') report[kind === 'BROKEN' ? 'broken' : 'invalid']++
  else if (kind === 'MISSING') report.missing++
}

const extractIds = (srcText, re) => [...srcText.matchAll(re)].map((m) => m[1])

async function main() {
  // ---- Phones ----
  const phonesText = src('src/data/phones.ts')
  const phoneIds = extractIds(phonesText, /id: '([a-z0-9-]+)'/g)
  report.total += phoneIds.length
  const dupPhones = phoneIds.filter((id, i) => phoneIds.indexOf(id) !== i)
  if (dupPhones.length) issue('INVALID', `重复 phone id: ${[...new Set(dupPhones)].join(', ')}`)
  else report.valid += phoneIds.length

  // ---- Brands ----
  const brandsText = src('src/data/brands.ts')
  const brandIds = extractIds(brandsText, /id: '([a-z0-9-]+)'/g)
  report.total += brandIds.length
  const brandSet = new Set(brandIds)

  // ---- Phone → Brand 引用 ----
  for (const id of phoneIds) {
    const m = phonesText.match(new RegExp(`id: '${id}'[\\s\\S]*?brandId: '([a-z0-9-]+)'`))
    if (!m) { issue('BROKEN', `${id}: 缺 brandId`); continue }
    if (!brandSet.has(m[1])) issue('BROKEN', `${id}: brandId '${m[1]}' 不存在于 brands`)
  }

  // ---- Story / Journey / Scene / Event 引用 ----
  const storiesText = src('src/data/stories.ts')
  const storyIds = extractIds(storiesText, /id: '([a-z0-9-]+)'/g)
  const storySet = new Set(storyIds)
  const phoneSet = new Set(phoneIds)
  for (const sid of storyIds) {
    const block = storiesText.match(new RegExp(`id: '${sid}'[\\s\\S]*?\\n  \\}`))
    if (!block) continue
    for (const pid of extractIds(block[0], /phoneId: '([a-z0-9-]+)'/g)) {
      if (!phoneSet.has(pid)) issue('BROKEN', `story ${sid}: phoneId '${pid}' 不存在`)
    }
    for (const pid of extractIds(block[0], /'([a-z0-9-]+)'(?=[,\n]*(?:featuredPhoneIds)?)/g)) {
      // featuredPhoneIds 数组引用
    }
  }
  const journeysText = src('src/data/journeys/index.ts')
  const journeyIds = extractIds(journeysText, /id: '([a-z0-9-]+)'/g)
  for (const jid of journeyIds) {
    const block = journeysText.match(new RegExp(`id: '${jid}'[\\s\\S]*?\\n  \\}`))
    if (!block) continue
    for (const pid of extractIds(block[0], /phoneId: '([a-z0-9-]+)'/g)) {
      if (!phoneSet.has(pid)) issue('BROKEN', `journey ${jid}: phoneId '${pid}' 不存在`)
    }
  }
  const scenesText = src('src/data/scenes/index.ts')
  const sceneIds = extractIds(scenesText, /id: '(scene-[a-z0-9-]+)'/g)
  for (const scid of sceneIds) {
    const block = scenesText.match(new RegExp(`id: '${scid}'[\\s\\S]*?\\n  \\},`))
    if (!block) continue
    for (const pid of extractIds(block[0], /phoneId: '([a-z0-9-]+)'/g)) {
      if (!phoneSet.has(pid)) issue('BROKEN', `scene ${scid}: phoneId '${pid}' 不存在`)
    }
    for (const sid of extractIds(block[0], /storyIds: \[([^\]]*)\]/g).flatMap((s) => s.split(',').map((v) => v.replace(/['" ]/g, '')).filter(Boolean))) {
      if (!storySet.has(sid)) issue('BROKEN', `scene ${scid}: storyId '${sid}' 不存在`)
    }
  }
  const eventsText = src('src/data/events.ts')
  const eventIds = extractIds(eventsText, /id: '([a-z0-9-]+)'/g)
  report.total += eventIds.length + storyIds.length + journeyIds.length + sceneIds.length
  if (eventIds.length === 0) issue('MISSING', 'events 数据为空')

  // ---- 年份合法性 ----
  for (const y of extractIds(phonesText, /releaseYear: (\d{4})/g).map(Number)) {
    if (y < 1973 || y > 2026) issue('INVALID', `phone 年份越界: ${y}`)
  }

  // ---- 来源 ----
  // 注：normalize.ts 的 sourcesOf() 为每台设备保证一条「藏品文字（原创综述）」
  // 来源声明，因此运行时 provenance 必然存在；此处只标记完全无任何
  // 来源线索（assetMeta / model / featured 均缺）的条目供人工复核。
  const noSource = phoneIds.filter((id) => {
    const block = phonesText.match(new RegExp(`id: '${id}'[\\s\\S]*?\\n  \\},`))
    return block && !block[0].includes('assetMeta') && !block[0].includes('model:') && !block[0].includes('significance')
  })
  for (const id of noSource) issue('MISSING', `${id}: 种子无补充来源线索（运行时由 normalize 提供默认综述来源）`)

  // ---- 资产状态 ----
  let approved = 0, verified = 0, missingAssets = 0
  for (const [pid, angles] of Object.entries(manifest.phones)) {
    if (!phoneSet.has(pid)) { issue('BROKEN', `资产清单中的 phoneId '${pid}' 不存在`); continue }
    for (const [angle, a] of Object.entries(angles)) {
      if (a.status === 'approved') approved++
      else if (a.status === 'verified') verified++
      else missingAssets++
      try { readFileSync('public' + a.path) } catch { issue('MISSING', `资产文件缺失: ${a.path}`) }
    }
  }
  console.log(`phones: ${phoneIds.length} | brands: ${brandIds.length} | stories: ${storyIds.length} | journeys: ${journeyIds.length} | events: ${eventIds.length} | scenes: ${sceneIds.length}`)
  console.log(`assets: approved ${approved} / verified ${verified} / other ${missingAssets}`)
  console.log(`issues: ${report.issues.length} (broken ${report.broken}, invalid ${report.invalid}, missing ${report.missing})`)
  for (const i of report.issues.slice(0, 20)) console.log(`  [${i.kind}] ${i.detail}`)
  if (report.issues.length > 20) console.log(`  ... 及 ${report.issues.length - 20} 项`)

  mkdirSync('reports', { recursive: true })
  writeFileSync('reports/content-report.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    counts: { phones: phoneIds.length, brands: brandIds.length, stories: storyIds.length, journeys: journeyIds.length, events: eventIds.length, scenes: sceneIds.length },
    assets: { approved, verified, other: missingAssets },
    ...report,
  }, null, 2))
  console.log('reports/content-report.json 已生成')
}

main().catch((e) => { console.error(e); process.exit(1) })
