// 阶段 1a · Wikidata 设备身份发现（V0.2.5 §8.1 / §14）
// 用法: node scripts/fetch-wikidata.mjs [--only id1,id2]
// 输出: scripts/wikidata/<phoneId>.json（身份/年份/制造商，供策展参考）
// 网络不可用时逐台记录失败并继续（§21）。

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  TARGETS, UA, stripHtml, readJson, writeJson, fileExists, onlyFilter, recordError,
} from './lib/assets-common.mjs'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'wikidata')
await mkdir(OUT_DIR, { recursive: true })

const targets = onlyFilter(process.argv, TARGETS)
let ok = 0

async function wbSearch(name) {
  const u = new URL('https://www.wikidata.org/w/api.php')
  u.searchParams.set('action', 'wbsearchentities')
  u.searchParams.set('search', name)
  u.searchParams.set('language', 'en')
  u.searchParams.set('format', 'json')
  u.searchParams.set('limit', '5')
  const res = await fetch(u, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Wikidata ${res.status}`)
  const j = await res.json()
  return j?.search ?? []
}

async function wbGetEntity(id) {
  const u = new URL('https://www.wikidata.org/w/api.php')
  u.searchParams.set('action', 'wbgetentities')
  u.searchParams.set('ids', id)
  u.searchParams.set('props', 'labels|descriptions|claims')
  u.searchParams.set('languages', 'en|zh')
  u.searchParams.set('format', 'json')
  const res = await fetch(u, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Wikidata ${res.status}`)
  return (await res.json())?.entities?.[id]
}

function claim(entities, prop) {
  const list = entities?.claims?.[prop]
  if (!Array.isArray(list) || list.length === 0) return undefined
  const v = list[0]?.mainsnak?.datavalue?.value
  return typeof v === 'object' && v !== null ? (v.time ?? v.id) : v
}

for (const t of targets) {
  const outPath = path.join(OUT_DIR, `${t.id}.json`)
  if (await fileExists(outPath)) {
    console.log(`skip ${t.id}（已有身份档案，幂等）`)
    continue
  }
  process.stdout.write(`wikidata ${t.id} … `)
  try {
    let entity = null
    let matched = null
    for (const q of [t.id.replace(/-/g, ' '), t.queries[0]]) {
      const results = await wbSearch(q)
      matched = results.find((r) => /phone|mobile|communicator/i.test(r.description ?? '')) ?? results[0]
      if (matched) break
    }
    if (matched?.id) entity = await wbGetEntity(matched.id)
    if (!entity) throw new Error('无匹配实体')
    const record = {
      phoneId: t.id,
      wikidataId: matched.id,
      label: stripHtml(entity.labels?.en?.value ?? matched.label),
      description: stripHtml(entity.descriptions?.en?.value ?? matched.description ?? ''),
      inception: claim(entity, 'P571'),
      manufacturer: claim(entity, 'P176'),
      note: '仅作策展参考的结构化身份数据；不作为图片来源。',
      fetchedAt: new Date().toISOString(),
    }
    await writeJson(outPath, record)
    ok++
    console.log(`✓ ${record.wikidataId} ${record.label}`)
  } catch (e) {
    console.log(`✗ ${e.message}`)
    await recordError('wikidata', t.id, e.message)
  }
}

console.log(`\nwikidata discovery: ${ok}/${targets.length} → scripts/wikidata/`)
