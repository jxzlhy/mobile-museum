<script setup lang="ts">
import { computed } from 'vue'
import { phoneImageList } from '@/data/assets'
import { EXHIBIT_SOURCE_NOTE } from '@/data/exhibits'
import type { Phone } from '@/data/types'

// Source / Fact Layer（V0.6 规范 §29–§32 / §74–§75）：
// ABOUT THIS RECORD —— FACTS / SOURCES / IMAGE CREDITS /
// MODEL CREDITS / LAST VERIFIED。Provenance 三问（§32）：
// 这条事实从哪来？这张图从哪来？这个模型谁做的？
// 没有真实审核记录就不显示 LAST VERIFIED 日期（§75：不写假日期）。

const props = defineProps<{ phone: Phone }>()

/** FACTS：从规格数据派生，统一标注来源为博物馆原创整理（§31 sourceIds）。 */
const facts = computed(() => {
  const p = props.phone
  const rows: Array<{ label: string; value: string; sourceIds: string[] }> = []
  if (p.releaseYear) rows.push({ label: '发布年份', value: String(p.releaseYear), sourceIds: ['src-curation'] })
  if (p.specs?.weight) rows.push({ label: '重量', value: `${p.specs.weight} g`, sourceIds: ['src-curation'] })
  if (p.specs?.display) rows.push({ label: '屏幕', value: p.specs.display, sourceIds: ['src-curation'] })
  if (p.specs?.battery) rows.push({ label: '电池', value: p.specs.battery, sourceIds: ['src-curation'] })
  if (p.specs?.operatingSystem) rows.push({ label: '系统', value: p.specs.operatingSystem, sourceIds: ['src-curation'] })
  return rows
})

const imageCredits = computed(() =>
  phoneImageList(props.phone)
    .filter((img) => img.source)
    .map((img) => ({
      id: img.path,
      alt: img.alt ?? props.phone.name,
      author: img.source?.author ?? '未知作者',
      license: img.source?.license ?? '',
      licenseUrl: img.source?.licenseUrl,
      sourceUrl: img.source?.url,
    })),
)

const hasContent = computed(
  () => facts.value.length > 0 || props.phone.sources.length > 0 || imageCredits.value.length > 0 || props.phone.model,
)
</script>

<template>
  <details v-if="hasContent" class="source">
    <summary class="label">ABOUT THIS RECORD · 档案来源与事实</summary>

    <!-- FACTS（§31） -->
    <section v-if="facts.length" class="source__block">
      <p class="label source__kind-head">FACTS · 档案事实</p>
      <dl class="source__facts">
        <div v-for="f in facts" :key="f.label" class="source__fact">
          <dt class="label">{{ f.label }}</dt>
          <dd class="mono">
            {{ f.value }}
            <span class="source__fact-src mono" :title="'来源：' + f.sourceIds.join(', ')">[{{ f.sourceIds.join(', ') }}]</span>
          </dd>
        </div>
      </dl>
    </section>

    <!-- SOURCES / CREDITS -->
    <ul class="source__list">
      <li class="source__row">
        <span class="label source__kind">SOURCES</span>
        <span class="body-md source__detail">{{ EXHIBIT_SOURCE_NOTE }}</span>
      </li>
      <li v-if="phone.model" class="source__row">
        <span class="label source__kind">MODEL CREDITS</span>
        <span class="body-md source__detail">原创程序化模型，自有版权（非扫描、非第三方资产）。</span>
      </li>
      <li v-for="s in phone.sources" :key="s.title ?? s.provider" class="source__row">
        <span class="label source__kind">{{ s.title ?? s.provider }}</span>
        <span class="body-md source__detail">{{ s.note }}</span>
      </li>
      <li v-for="c in imageCredits" :key="c.id" class="source__row">
        <span class="label source__kind">IMAGE CREDITS · {{ c.alt }}</span>
        <span class="body-md source__detail">
          Photo: {{ c.author }}
          <template v-if="c.license">
            · License:
            <a v-if="c.licenseUrl" :href="c.licenseUrl" target="_blank" rel="noopener" class="source__link">{{ c.license }}</a>
            <template v-else>{{ c.license }}</template>
          </template>
          <a v-if="c.sourceUrl" :href="c.sourceUrl" target="_blank" rel="noopener" class="source__link">来源页</a>
        </span>
      </li>
    </ul>

    <!-- LAST VERIFIED（§75）：没有真实审核记录就不显示假日期 -->
    <p class="label source__verified">LAST VERIFIED · 尚未完成人工复核（以现有来源为准）</p>
  </details>
</template>

<style lang="scss" scoped>
.source {
  border-top: 1px solid $c-line-soft;
  padding-top: $sp-4;

  summary {
    cursor: pointer;
    font-size: 9px;
    letter-spacing: 0.2em;
    color: $c-text-3;

    &:hover {
      color: $c-text-2;
    }
  }

  &__block {
    margin-top: $sp-3;
  }

  &__kind-head {
    font-size: 9px;
    color: $c-text-3;
    margin-bottom: $sp-2;
  }

  &__facts {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $sp-2 $sp-4;

    @include desktop {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__fact {
    dd {
      margin-top: 2px;
      font-size: 12px;
      color: $c-text-2;
      word-break: keep-all;
    }
  }

  &__fact-src {
    font-size: 8px;
    color: $c-text-3;
    margin-left: $sp-1;
  }

  &__list {
    margin-top: $sp-3;
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: $sp-3;
    padding-block: $sp-2;

    @include desktop {
      grid-template-columns: 150px 1fr;
    }
  }

  &__kind {
    font-size: 9px;
    word-break: keep-all;
  }

  &__detail {
    font-size: 12px;
    color: $c-text-3;
    line-height: 1.7;
    word-break: keep-all;
  }

  &__link {
    margin-left: $sp-2;
    color: $c-text-2;
    border-bottom: 1px solid $c-line;

    &:hover {
      color: $c-text;
    }
  }

  &__verified {
    margin-top: $sp-3;
    font-size: 9px;
    color: $c-text-3;
  }
}
</style>
