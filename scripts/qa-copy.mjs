// 内容文案 QA · 只扫字符串字面量的「内容」，排除代码定界符干扰
// 用法: node scripts/qa-copy.mjs [--fix-quotes]
// --fix-quotes：把内容中的 ASCII 直引号 "x" 统一替换为中文弯引号 “x”（成对）

import { readFileSync, writeFileSync } from 'node:fs'

const FILES = [
  'src/data/phones.ts',
  'src/data/brands.ts',
  'src/data/stories.ts',
  'src/data/exhibits.ts',
  'src/data/evolution.ts',
  'src/data/events.ts',
]

const fixQuotes = process.argv.includes('--fix-quotes')

const CHECKS = [
  { name: '中文后跟半角逗号', re: /[\u4e00-\u9fff],/g },
  { name: '中文后跟半角句号', re: /[\u4e00-\u9fff]\.(?![\da-zA-Z])/g },
  { name: '半角括号包裹中文', re: /\([^()]*[\u4e00-\u9fff][^()]*\)/g },
  { name: '单个…（应为……）', re: /(?<!…)…(?!…)/g },
  { name: '双连字符（应为——）', re: /--/g },
  { name: '内容含 ASCII 直引号', re: /"/g },
  { name: '中文后半角冒号', re: /[\u4e00-\u9fff]:\s/g },
  { name: '连续两空格', re: /\S {2,}\S/g },
  { name: '常见错别字：的地得叠用', re: /的的|地地|得得/g },
  { name: '常见错别字：在/再', re: /[，，]在[一这]|再[时间点]/g },
]

let total = 0
const quotePairs = []

for (const file of FILES) {
  let src
  try {
    src = readFileSync(new URL('../' + file, import.meta.url), 'utf8')
  } catch {
    continue
  }
  // 提取所有单引号字符串字面量（TS 源码定界符），只查其内容
  const literals = []
  const litRe = /'((?:[^'\\\n]|\\.)*)'/g
  let lm
  while ((lm = litRe.exec(src))) {
    literals.push({ content: lm[1], index: lm.index, full: lm[0] })
  }

  for (const { content, index } of literals) {
    for (const { name, re } of CHECKS) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(content))) {
        // 排除纯英文上下文（英文里半角逗号句号合法）：前后 2 字符内有中文才报
        const ctx = content.slice(Math.max(0, m.index - 6), m.index + 12)
        if (!/[\u4e00-\u9fff]/.test(ctx)) continue
        const line = src.slice(0, index).split('\n').length
        console.log(`${file}:${line}  [${name}]  “${content.slice(Math.max(0, m.index - 10), m.index + 20)}”`)
        total++
        if (m[0].length === 0) re.lastIndex++
      }
    }
    // 收集直引号成对情况供修复
    if (fixQuotes && (content.match(/"/g) ?? []).length >= 2) quotePairs.push({ file, content, index })
  }
}

console.log(`\n共 ${total} 处疑似不一致`)

if (fixQuotes && quotePairs.length) {
  let fixed = 0
  for (const file of [...new Set(quotePairs.map((p) => p.file))]) {
    let src = readFileSync(new URL('../' + file, import.meta.url), 'utf8')
    const litRe = /'((?:[^'\\\n]|\\.)*)'/g
    src = src.replace(litRe, (full, inner) => {
      if (!inner.includes('"')) return full
      // 成对替换："x" → “x”（开引号在非中文标点/起始后，闭引号在中文/标点前——简单交替即可）
      let open = true
      const replaced = inner.replace(/"/g, () => (open = !open) ? '”' : '“')
      fixed++
      return `'${replaced}'`
    })
    writeFileSync(new URL('../' + file, import.meta.url), src)
  }
  console.log(`--fix-quotes：处理 ${quotePairs.length} 条字面量（交替配对）`)
}
