<script setup lang="ts">
import { computed } from 'vue'
import { phoneImageList } from '@/data/assets'
import type { Phone } from '@/data/types'

// 资料来源与图片署名（规范 §63–§64 / §107 / §70）。
const props = defineProps<{ phone: Phone }>()

interface Credit {
  id: string
  alt: string
  author: string
  license: string
  licenseUrl?: string
  sourceUrl?: string
}

const imageCredits = computed<Credit[]>(() =>
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
</script>

<template>
  <footer class="sources">
    <p class="label sources__head">资料来源</p>
    <ul class="sources__list">
      <li v-for="s in phone.sources" :key="s.title ?? s.provider" class="sources__row">
        <span class="sources__kind label">{{ s.title ?? s.provider }}</span>
        <span class="sources__detail body-md">
          {{ s.note }}
          <a v-if="s.url" :href="s.url" target="_blank" rel="noopener" class="sources__link">链接</a>
        </span>
      </li>
      <li v-for="c in imageCredits" :key="'img-' + c.id" class="sources__row">
        <span class="sources__kind label">图片 · {{ c.alt }}</span>
        <span class="sources__detail body-md">
          Photo: {{ c.author }}
          <template v-if="c.license"> · License:
            <a v-if="c.licenseUrl" :href="c.licenseUrl" target="_blank" rel="noopener" class="sources__link">{{ c.license }}</a>
            <template v-else>{{ c.license }}</template>
          </template>
          <a v-if="c.sourceUrl" :href="c.sourceUrl" target="_blank" rel="noopener" class="sources__link">来源页</a>
        </span>
      </li>
    </ul>
  </footer>
</template>

<style lang="scss" scoped>
.sources {
  padding: $sp-5 $sp-6;

  &__head {
    margin-bottom: $sp-3;
    font-size: 10px;
  }

  &__list {
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: $sp-4;
    padding-block: $sp-2;
    border-top: 1px solid rgba(255, 255, 255, 0.06);

    &:first-child {
      border-top: none;
    }

    // 移动端单列：避免长 URL/英文串在 150px 固定列布局下横向溢出
    @media (max-width: 575px) {
      grid-template-columns: 1fr;
      gap: $sp-1;
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
    overflow-wrap: anywhere; // 长授权 URL 与英文串断行（规范 §70 防溢出）
  }

  &__link {
    margin-left: $sp-2;
    color: $c-text-2;
    border-bottom: 1px solid $c-line;

    &:hover {
      color: $c-text;
    }
  }
}
</style>
