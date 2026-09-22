<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { curatorService } from '@/services/curator/curatorService'
import { getRenderer } from '@/components/curator/blocks'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import { memoryService } from '@/services/memoryService'
import { phoneService } from '@/services/phoneService'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import type { CuratedExhibition } from '@/services/curator/types'
import type { Phone } from '@/data/types'

// Share 页（V0.5 规范 §23 / V0.8 §32–§35）：
// 像一个独立小展览 —— 只有展签与展品，没有编辑 / 删除等后台操作。
// v2 payload 渲染 Blocks；v1 旧链接回退为展品列表。
// payload 全部来自 URL encoded state，无账号无 Token（§22）。

useStageScene(() => new AmbientScene())

const route = useRoute()
const status = ref<'loading' | 'ready' | 'error'>('loading')
const exhibition = ref<CuratedExhibition | null>(null)
const legacyPhones = ref<Phone[]>([])
const title = ref('')
const intro = ref<string | undefined>()
const coverPhone = ref<Phone>()

onMounted(async () => {
  const payload = String(route.params.payload ?? '')
  const parsed = await curatorService.parseShareUrl(payload)
  if (!parsed) {
    status.value = 'error'
    document.title = '展览链接无效 — 手机历史博物馆'
    return
  }
  exhibition.value = parsed
  title.value = parsed.title
  intro.value = parsed.intro
  if (parsed.coverPhoneId) coverPhone.value = await phoneService.getPhoneById(parsed.coverPhoneId)
  // v1 兼容：无 blocks 时按展品列表渲染
  if (parsed.blocks.length === 0) {
    legacyPhones.value = await phoneService.resolveMany(parsed.id === 'shared-v1' ? [] : [])
  }
  status.value = 'ready'
  document.title = `${parsed.title} · 策展分享 — 手机历史博物馆`
})

// 分享页的浏览也算参观记录（§25），但不写 discovery —— 状态严格分离（§26）
onMounted(() => {
  const first = exhibition.value?.blocks.find((b) => b.type === 'exhibit')
  const phoneId = (first?.data as { phoneId?: string })?.phoneId
  if (phoneId) memoryService.visit(phoneId)
})

const span = computed(() => {
  if (legacyPhones.value.length === 0) return null
  const years = legacyPhones.value.map((p) => p.releaseYear)
  return { from: Math.min(...years), to: Math.max(...years) }
})
</script>

<template>
  <div class="pshare container">
    <p v-if="status === 'loading'" class="label" style="padding-block: 160px">正在展开展览……</p>

    <section v-else-if="status === 'error'" class="pshare__error glass-card">
      <p class="label">EXHIBITION LINK</p>
      <h1 class="heading-1" style="margin-block: 20px">这个展览链接<br />无法打开。</h1>
      <p class="body-md">链接可能不完整，或内容超出了分享上限。</p>
      <div style="margin-top: 24px">
        <MuseumButton to="/" variant="cta">回到博物馆</MuseumButton>
      </div>
    </section>

    <template v-else-if="exhibition">
      <header class="pshare__head">
        <p class="label">A PERSONAL EXHIBITION · 个人策展</p>
        <div v-if="coverPhone" class="pshare__cover"><PhonePhoto :phone="coverPhone" /></div>
        <h1 class="heading-1 pshare__title">{{ title }}</h1>
        <p v-if="intro" class="body-lg pshare__intro">{{ intro }}</p>
        <p v-if="exhibition.blocks.length" class="mono pshare__meta">{{ exhibition.blocks.length }} BLOCKS · CURATED WITH MOBILE MUSEUM</p>
        <p v-else-if="span" class="mono pshare__meta">{{ legacyPhones.length }} EXHIBITS · {{ span.from }} — {{ span.to }}</p>
      </header>

      <!-- V0.8：Blocks 渲染（只读，无编辑控件） -->
      <div v-if="exhibition.blocks.length" class="pshare__blocks">
        <section v-for="(b, i) in exhibition.blocks" :key="b.id" class="pshare__block">
          <p class="label mono pshare__block-idx">{{ String(i + 1).padStart(2, '0') }} · {{ b.type.toUpperCase() }}</p>
          <component :is="getRenderer(b.type)" v-if="getRenderer(b.type)" :block="b" />
          <p v-else class="mono pshare__unavailable">CONTENT UNAVAILABLE</p>
        </section>
      </div>

      <ol v-else class="pshare__list">
        <li v-for="(p, i) in legacyPhones" :key="p.id" class="pshare__row">
          <p class="pshare__year year-mid">{{ p.releaseYear }}</p>
          <span class="pshare__art"><PhonePhoto :phone="p" thumb /></span>
          <div class="pshare__info">
            <router-link :to="`/museum/exhibit/${p.id}`" class="pshare__name" data-cursor="看展">{{ p.name }}</router-link>
            <p class="label pshare__brand">{{ p.brandName }}</p>
          </div>
          <p class="mono pshare__index">{{ String(i + 1).padStart(2, '0') }}</p>
        </li>
      </ol>

      <footer class="pshare__foot">
        <MuseumButton to="/museum" variant="cta">走进 MOBILE MUSEUM</MuseumButton>
        <p class="label pshare__hint">这座小型展览由参观者策展，通过链接分享，不含任何账号信息。</p>
      </footer>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.pshare {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__error {
    padding: $sp-8 $sp-6;
    max-width: 480px;
  }

  &__cover {
    margin-bottom: $sp-4;
    height: 180px;
    display: flex;
    align-items: center;

    :deep(.phone-photo__img) {
      max-height: 170px;
      object-fit: contain;
    }
  }

  &__blocks {
    margin-top: $sp-6;
    display: flex;
    flex-direction: column;
    gap: $sp-6;
  }

  &__block {
    border-top: 1px solid $c-line-soft;
    padding-top: $sp-4;
  }

  &__block-idx {
    font-size: 9px;
    color: $c-text-3;
    letter-spacing: 0.2em;
    margin-bottom: $sp-3;
  }

  &__unavailable {
    font-size: 11px;
    color: $c-text-3;
    letter-spacing: 0.15em;
  }

  &__head {
    .label {
      margin-bottom: $sp-2;
    }
  }

  &__title {
    word-break: keep-all;
  }

  &__intro {
    margin-top: $sp-4;
    max-width: 40ch;
    color: $c-text-2;
  }

  &__meta {
    margin-top: $sp-3;
    color: $c-accent;
    font-size: 12px;
    letter-spacing: 0.25em;
  }

  &__list {
    margin-top: $sp-7;
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
  }

  &__brand {
    font-size: 9px;
  }

  &__index {
    font-size: 11px;
    color: $c-text-3;
  }

  &__foot {
    margin-top: $sp-8;
    padding-top: $sp-6;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-3;
    border-top: 1px solid $c-line-soft;
  }

  &__hint {
    font-size: 9px;
    color: $c-text-3;
  }
}
</style>
