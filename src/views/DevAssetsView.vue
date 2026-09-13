<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { phoneService } from '@/services/phoneService'
import { assetSrc, getPhoneAssets, ANGLE_LABELS } from '@/data/assets'
import { formFactorLabel } from '@/data/formFactors'
import type { AssetAngle, Phone } from '@/data/types'

// Asset Debug（V0.2.5 §19）：开发环境专用的资产状态面板。
// 生产构建不渲染内容（由 route meta + isDev 双保险）。

const isDev = import.meta.env.DEV

const phones = ref<Phone[]>([])
const loading = ref(true)

onMounted(async () => {
  if (!isDev) return
  phones.value = await phoneService.getPhones()
  loading.value = false
})

interface Row {
  phone: Phone
  angle: AssetAngle | 'gallery'
  status: string
  sourceType?: string
  author?: string
  license?: string
  src?: string
}

const rows = computed<Array<Row>>(() => {
  const out: Row[] = []
  for (const p of phones.value) {
    const assets = getPhoneAssets(p.id)
    if (!assets) {
      out.push({ phone: p, angle: 'hero', status: 'missing' })
      continue
    }
    const angles: AssetAngle[] = ['hero', 'front', 'back', 'side', 'detail']
    let hasAny = false
    for (const a of angles) {
      const asset = assets[a]
      if (!asset) continue
      hasAny = true
      out.push({
        phone: p,
        angle: a,
        status: asset.status,
        sourceType: asset.source?.type,
        author: asset.source?.author,
        license: asset.source?.license,
        src: asset.status === 'approved' ? assetSrc(asset, true) : undefined,
      })
    }
    const galleryList = assets.gallery ?? []
    for (const g of galleryList) {
      hasAny = true
      out.push({
        phone: p,
        angle: 'gallery',
        status: g.status,
        sourceType: g.source?.type,
        author: g.source?.author,
        license: g.source?.license,
      })
    }
    if (!hasAny) out.push({ phone: p, angle: 'hero', status: 'missing' })
  }
  return out
})

const stats = computed(() => {
  const by: Record<string, number> = { approved: 0, verified: 0, candidate: 0, missing: 0, rejected: 0 }
  for (const r of rows.value) by[r.status] = (by[r.status] ?? 0) + 1
  return {
    total: rows.value.length,
    phones: phones.value.length,
    ...by,
  }
})

const statusClass = (s: string) =>
  s === 'approved' ? 'dev-assets__status--approved' : s === 'missing' ? 'dev-assets__status--missing' : 'dev-assets__status--mid'

const statusFilter = ref<string>('all')
const filteredRows = computed(() =>
  statusFilter.value === 'all' ? rows.value : rows.value.filter((r) => r.status === statusFilter.value),
)

// 发现统计（V0.2.6 §22/§23）
import candidatesFileJson from '../../scripts/assets-candidates.json'
const discovery = computed(() => {
  const entries = Object.entries(candidatesFileJson as Record<string, { status?: string; candidates?: unknown[] }>)
  return {
    discovered: entries.filter(([, v]) => v.status === 'candidate').length,
    candidates: entries.reduce((n, [, v]) => n + (v.candidates?.length ?? 0), 0),
  }
})
</script>

<template>
  <div class="page dev-assets container">
    <template v-if="!isDev">
      <p class="label" style="padding-block: 160px">此面板仅在开发环境可用（npm run dev）。</p>
    </template>

    <template v-else>
      <header class="dev-assets__head">
        <p class="label">ASSET DEBUG · 仅开发环境</p>
        <h1 class="dev-assets__title heading-1">资产状态</h1>
        <p class="dev-assets__sub mono">
          {{ stats.phones }} 台手机 · {{ stats.total }} 个图片槽位
        </p>
      </header>

      <!-- 统计（规范 §19 / §22）：点击过滤 -->
      <div class="dev-assets__stats">
        <button
          v-for="(v, k) in stats"
          :key="k"
          class="dev-assets__stat"
          :class="{ 'dev-assets__stat--on': statusFilter === k || (statusFilter === 'all' && k === 'total') }"
          @click="statusFilter = k === 'total' ? 'all' : k"
        >
          <p class="dev-assets__stat-value mono">{{ v }}</p>
          <p class="dev-assets__stat-label label">{{ k }}</p>
        </button>
        <div class="dev-assets__stat">
          <p class="dev-assets__stat-value mono">{{ discovery.discovered }} / {{ discovery.candidates }}</p>
          <p class="dev-assets__stat-label label">DISCOVERED / CANDIDATES</p>
        </div>
      </div>

      <p v-if="loading" class="label" style="padding-block: 64px">读取 manifest……</p>

      <table v-else class="dev-assets__table">
        <thead>
          <tr class="label">
            <th>手机</th>
            <th>角度</th>
            <th>状态</th>
            <th>来源</th>
            <th>许可证</th>
            <th>预览</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in filteredRows" :key="r.phone.id + r.angle + i">
            <td class="dev-assets__phone">
              <router-link :to="`/phone/${r.phone.id}`" class="dev-assets__link">
                {{ r.phone.name }}
                <span class="mono dev-assets__exno">{{ r.phone.exhibitNo }}</span>
              </router-link>
              <span class="dev-assets__brand label">{{ r.phone.brandName }} · {{ formFactorLabel(r.phone.formFactor) }}</span>
            </td>
            <td class="mono">{{ ANGLE_LABELS[r.angle] ?? r.angle }}</td>
            <td><span class="dev-assets__status mono" :class="statusClass(r.status)">{{ r.status }}</span></td>
            <td class="dev-assets__meta">{{ r.sourceType ?? '—' }}</td>
            <td class="dev-assets__meta">{{ r.license ?? '—' }}<template v-if="r.author"> · {{ r.author }}</template></td>
            <td>
              <img v-if="r.src" :src="r.src" alt="" class="dev-assets__preview" loading="lazy" />
              <span v-else class="dev-assets__noline label">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.dev-assets {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;

  &__title {
    margin-top: $sp-2;
  }

  &__sub {
    margin-top: $sp-3;
    color: $c-text-3;
    font-size: 12px;
  }

  &__stats {
    margin-top: $sp-6;
    display: flex;
    flex-wrap: wrap;
    gap: $sp-5;
  }

  &__stat {
    padding: $sp-4 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 12px;
    min-width: 96px;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.3s var(--ease-museum);

    &--on {
      border-color: $c-accent;
    }
  }

  &__stat-value {
    font-size: 22px;
    font-weight: 600;
  }

  &__stat-label {
    font-size: 9px;
    margin-top: 2px;
  }

  &__table {
    margin-top: $sp-7;
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th {
      text-align: left;
      padding: $sp-2 $sp-3;
      border-bottom: 1px solid $c-line;
      font-size: 9px;
    }

    td {
      padding: $sp-2 $sp-3;
      border-bottom: 1px solid $c-line-soft;
      vertical-align: middle;
    }
  }

  &__link {
    font-weight: 400;
    word-break: keep-all;

    &:hover {
      color: $c-text;
    }
  }

  &__exno {
    margin-left: $sp-2;
    font-size: 9px;
    color: $c-accent;
  }

  &__brand {
    display: block;
    font-size: 9px;
    margin-top: 2px;
  }

  &__status {
    @include label-style(9px);
    padding: 3px 9px;
    border-radius: 999px;
    border: 1px solid $c-line-soft;

    &--approved {
      color: #0a0a0a;
      background: rgba(255, 255, 255, 0.9);
      border-color: transparent;
    }

    &--missing {
      color: $c-text-3;
      border-style: dashed;
    }

    &--mid {
      color: $c-accent;
      border-color: rgba(184, 178, 164, 0.4);
    }
  }

  &__meta {
    color: $c-text-3;
    font-size: 11px;
    word-break: keep-all;
  }

  &__preview {
    height: 44px;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
  }

  &__noline {
    color: $c-text-3;
  }
}
</style>
