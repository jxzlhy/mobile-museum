import rulesJson from './match-rules.json'

// 型号精确匹配规则（V0.2.7 §6–§9）。
// 单一数据源是 src/data/assets/match-rules.json（管线 .mjs 与前端共用，
// 紧凑键名 i=include / p=preferred / e=exclude），此处提供带类型的导出，
// 仅用于候选评分与 /dev/assets 审阅展示。

export interface PhoneMatchRule {
  include: string[]
  preferred: string[]
  exclude: string[]
}

const raw = rulesJson as Record<string, { i?: string[]; p?: string[]; e?: string[] }>

export const PHONE_MATCH_RULES: Record<string, PhoneMatchRule> = Object.fromEntries(
  Object.entries(raw).map(([id, r]) => [
    id,
    { include: r.i ?? [], preferred: r.p ?? [], exclude: r.e ?? [] },
  ]),
)
