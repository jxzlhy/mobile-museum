<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'

// 我的手机史（规范 §43–§48）：参观者策划属于自己的展区。
// 默认按 releaseYear 升序（历史时间线），可切换「按加入顺序」；
// 支持展区统计与真实缩略图。

useStageScene(() => new AmbientScene())

const { collectionPhones, stats, sortMode, movePhone, removePhone, clearCollection } = useCollection()

const sortLabel = computed(() => (sortMode.value === 'era' ? '按年代' : '按加入顺序'))

function toggleSort() {
  sortMode.value = sortMode.value === 'era' ? 'added' : 'era'
}
</script>

<template>
  <div class="page collection container">
    <header class="collection__head">
      <p class="label">个人展区</p>
      <h1 class="heading-1" style="margin-top: 16px">我的手机<br />历史</h1>

      <p v-if="stats?.span" class="collection__span mono">
        你的移动岁月 · {{ stats.span.from }} — {{ stats.span.to }} · {{ stats.deviceCount }} 台设备
      </p>
      <p v-else-if="stats && stats.deviceCount === 1" class="collection__span mono">
        展区里有 1 台设备
      </p>
    </header>

    <!-- 空状态（规范 §75 / §95） -->
    <div v-if="collectionPhones.length === 0" class="collection__empty">
      <p class="body-lg">你的专属展区，正等待开展。</p>
      <p class="body-md">去藏品总目走一走，把塑造过移动历史的手机加入馆藏——博物馆会按年份为你陈列。</p>
      <div class="collection__empty-actions">
        <MuseumButton to="/phones" variant="cta">浏览全部藏品</MuseumButton>
        <MuseumButton to="/timeline" variant="line">走进时间长廊</MuseumButton>
      </div>
    </div>

    <template v-else>
      <!-- 排序 + 统计（规范 §47 / §48） -->
      <div class="collection__toolbar">
        <button class="collection__sort" @click="toggleSort">
          <span class="label">排序 · {{ sortLabel }}</span>
          <span class="collection__sort-icon mono">⇅</span>
        </button>
        <p v-if="stats" class="collection__stats label">
          {{ stats.deviceCount }} 台设备 · {{ stats.brandCount }} 个品牌
          <template v-if="stats.oldest !== stats.newest"> · 最早 {{ stats.oldest.releaseYear }}（{{ stats.oldest.name }}） · 最新 {{ stats.newest.releaseYear }}</template>
        </p>
      </div>

      <ol class="collection__timeline">
        <li v-for="(p, i) in collectionPhones" :key="p.id" class="collection__row">
          <p class="collection__year year-mid">{{ p.releaseYear }}</p>
          <span class="collection__art"><PhonePhoto :phone="p" thumb /></span>
          <div class="collection__info">
            <router-link :to="`/phone/${p.id}`" class="collection__name" data-cursor="看展">
              {{ p.name }}
            </router-link>
            <p class="label collection__brand">{{ p.brandName }}</p>
            <p class="collection__index mono">{{ sortMode === 'added' ? `第 ${i + 1} 件加入` : `设备编号 ${String(i + 1).padStart(2, '0')}` }}</p>
          </div>
          <div class="collection__actions">
            <button
              class="collection__btn"
              :disabled="i === 0"
              aria-label="上移"
              @click="movePhone(p.id, -1)"
            >
              ↑
            </button>
            <button
              class="collection__btn"
              :disabled="i === collectionPhones.length - 1"
              aria-label="下移"
              @click="movePhone(p.id, 1)"
            >
              ↓
            </button>
            <button class="collection__btn collection__btn--remove" aria-label="移出收藏" @click="removePhone(p.id)">
              ✕
            </button>
          </div>
        </li>
      </ol>

      <footer class="collection__foot hairline-top">
        <MuseumButton variant="line" @click="clearCollection">清空展区</MuseumButton>
      </footer>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.collection {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head {
    .label {
      margin-bottom: $sp-2;
    }
  }

  &__span {
    margin-top: $sp-5;
    color: $c-accent;
    font-size: 12px;
    letter-spacing: 0.25em;
    word-break: keep-all;
  }

  &__empty {
    margin-top: $sp-8;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-3;
    max-width: 40ch;

    .body-md {
      color: $c-text-3;
    }

    &-actions {
      margin-top: $sp-4;
      display: flex;
      gap: $sp-3;
      flex-wrap: wrap;
    }
  }

  &__toolbar {
    margin-top: $sp-7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $sp-4;
    flex-wrap: wrap;
  }

  &__sort {
    display: inline-flex;
    align-items: center;
    gap: $sp-2;
    padding: 8px 16px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    transition: border-color 0.3s var(--ease-museum);

    .label {
      color: $c-text-2;
      word-break: keep-all;
    }

    &-icon {
      color: $c-accent;
      font-size: 12px;
    }

    &:hover {
      border-color: $c-line;
    }
  }

  &__stats {
    font-size: 9px;
    text-align: right;
    word-break: keep-all;
  }

  &__timeline {
    margin-top: $sp-5;
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: auto 40px 1fr auto;
    align-items: center;
    gap: $sp-4;
    padding-block: $sp-4;
    border-top: 1px solid $c-line-soft;

    &:last-child {
      border-bottom: 1px solid $c-line-soft;
    }

    @include desktop {
      grid-template-columns: auto 72px 1fr auto;
      gap: $sp-5;
    }
  }

  &__year {
    font-size: clamp(24px, 6vw, 56px);
    color: $c-text;
  }

  &__art {
    width: 36px;
    height: 56px;
    display: flex;
    align-items: center;

    @include desktop {
      width: 52px;
      height: 72px;
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 16px;
    font-weight: 350;
    word-break: keep-all;
    line-height: 1.3;
  }

  &__brand {
    font-size: 9px;
    word-break: keep-all;
  }

  &__index {
    font-size: 10px;
    color: $c-text-3;
    margin-top: $sp-1;
    word-break: keep-all;
  }

  &__actions {
    display: flex;
    gap: $sp-1;

    @include desktop {
      gap: $sp-2;
    }
  }

  &__btn {
    width: 30px;
    height: 30px;
    border: 1px solid $c-line-soft;
    border-radius: 50%;
    color: $c-text-2;
    font-size: 12px;
    transition: border-color 0.3s var(--ease-museum), color 0.3s var(--ease-museum), opacity 0.3s;

    @include desktop {
      width: 36px;
      height: 36px;
      font-size: 13px;
    }

    &:hover:not(:disabled) {
      color: $c-text;
      border-color: $c-line;
    }

    &:disabled {
      opacity: 0.25;
      cursor: default;
    }

    &--remove:hover {
      color: #d99a9a;
      border-color: rgba(217, 154, 154, 0.4);
    }
  }

  &__foot {
    margin-top: $sp-8;
    padding-top: $sp-6;
  }
}
</style>
