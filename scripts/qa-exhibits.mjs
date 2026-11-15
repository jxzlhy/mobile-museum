// Exhibits 数据一致性扫描（V0.5 深度观展规范 §10–§17）
// 用法: node scripts/qa-exhibits.mjs
// 检查：phoneId 存在 / 材料组件引用可解析 / 细节 partId 存在 /
//       音频文件存在 + phoneId 一致 / 能力与内容自洽。

import { readFileSync, existsSync } from 'node:fs'

const PHONES = 'src/data/phones.ts'
const EXHIBITS = 'src/data/exhibits/index.ts'

const phoneSrc = readFileSync(PHONES, 'utf8')
const phoneIds = new Set([...phoneSrc.matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]))
const models = new Set([...phoneSrc.matchAll(/model: '([A-Za-z0-9_-]+)'/g)].map((m) => m[1]))

const exSrc = readFileSync(EXHIBITS, 'utf8')
let issues = 0
let warns = 0

// 逐个展品块：按 exhibitContents Record 顶层键（行首两空格）切分，
// 避免被 AudioGuide 内的 phoneId 干扰——那会把展品块从音频行截断，丢掉尾部部件
const blocks = [...exSrc.matchAll(/^  '([a-z0-9-]+)': \{/gm)].map((m, i, arr) => ({
  phoneId: m[1],
  body: exSrc.slice(m.index, arr[i + 1]?.index ?? exSrc.length),
}))

for (const b of blocks) {
  const tag = `[${b.phoneId}]`
  if (!phoneIds.has(b.phoneId)) {
    console.log(`✗ ${tag} phoneId 不存在于 phones.ts`)
    issues++
  }

  // 部件 id 与 modelNode（对象内字段顺序无关）
  const parts = [...b.body.matchAll(/\{[^{}]*?id:\s*'([A-Za-z0-9_-]+)'[^{}]*?modelNode:\s*'([^']+)'[^{}]*?\}/g)]
  const partIds = new Set(parts.map((p) => p[1]))
  const modelNodes = new Set(parts.map((p) => p[2]))

  // 材料引用：componentIds 应可解析为 modelNode 或 partId（可高亮即可）
  for (const mm of b.body.matchAll(/componentIds: \[([^\]]*)\]/g)) {
    const ids = [...mm[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
    for (const id of ids) {
      if (!modelNodes.has(id) && !partIds.has(id)) {
        console.log(`? ${tag} 材料组件 '${id}' 不在部件/模型节点清单（若为 3D 场景节点名则可）`)
        warns++
      }
    }
  }

  // 细节 partId
  for (const dm of b.body.matchAll(/partId: '([^']+)'/g)) {
    if (!partIds.has(dm[1])) {
      console.log(`✗ ${tag} 细节 partId '${dm[1]}' 不存在`)
      issues++
    }
  }

  // 音频：文件存在 + phoneId 一致
  const audio = b.body.match(/src: withBase\('([^']+)'\)/)
  if (audio) {
    const rel = audio[1].replace(/^\//, '')
    const f = `public/${rel}`
    if (!existsSync(f)) {
      console.log(`✗ ${tag} 音频文件缺失: ${f}`)
      issues++
    }
    const phoneInAudio = b.body.match(/phoneId: '([a-z0-9-]+)',\s*\n\s*title: '[^']*',\s*\n\s*src: withBase\('\/audio\/guides\/([a-z0-9-]+)\.m4a'\)/)
    if (phoneInAudio && phoneInAudio[1] !== phoneInAudio[2]) {
      console.log(`✗ ${tag} 音频 phoneId(${phoneInAudio[1]}) 与文件名(${phoneInAudio[2]})不一致`)
      issues++
    }
  }

  // 能力自洽：有 parts 才能讲结构，有 materials 才能讲材料
  const partCount = (b.body.match(/modelNode:/g) ?? []).length
  const matCount = (b.body.match(/componentIds:/g) ?? []).length
  const detailCount = (b.body.match(/partId:/g) ?? []).length
  if (partCount === 0 && (matCount > 0 || detailCount > 0)) {
    console.log(`? ${tag} 无部件但有材料/细节——结构模式将不可用`)
    warns++
  }

  console.log(`  ${tag} parts=${partCount} materials=${matCount} details=${detailCount} audio=${audio ? '✓' : '—'}`)
}

console.log(`\n展品 ${blocks.length} 项 · 问题 ${issues} · 警告 ${warns}`)
process.exit(0)
