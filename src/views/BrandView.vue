<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { brandService } from '@/services/brandService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import GlassCard from '@/components/common/GlassCard.vue'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import type { Brand, Phone } from '@/data/types'

// 品牌展馆（规范 §36 / §111）：铭牌、关键数字、长故事、年代与代表设备。
// 玻璃卡语言与展品页一致，磨砂悬浮于氛围画布之上。

const route = useRoute()
const brand = ref<Brand | null>(null)
const phones = ref<Phone[]>([])
const status = ref<'loading' | 'ready' | 'error'>('loading')

useStageScene(() => new AmbientScene())

async function load() {
  status.value = 'loading'
  const b = await brandService.getBrandById(String(route.params.id ?? ''))
  if (!b) {
    status.value = 'error'
    document.title = '未找到品牌 — 手机历史博物馆'
    return
  }
  brand.value = b
  phones.value = await brandService.getBrandPhones(b)
  status.value = 'ready'
  document.title = `${b.name} — 手机历史博物馆`
}

onMounted(load)
watch(
  () => route.params.id,
  (id, old) => {
    if (id && id !== old && route.name === 'brand') void load()
  },
)

const decades = computed(() => {
  const events = brand.value?.timeline ?? []
  const byDecade = new Map<number, string[]>()
  events.forEach((e) => {
    const dec = Math.floor(e.year / 10) * 10
    const arr = byDecade.get(dec) ?? []
    arr.push(`${e.year} — ${e.label}`)
    byDecade.set(dec, arr)
  })
  return [...byDecade.entries()].sort((a, b) => a[0] - b[0])
})
</script>

<template>
  <div class="page brand container">
    <section v-if="status === 'error'" class="brand__missing">
      <GlassCard>
        <div class="brand__missing-inner">
          <p class="label">品牌未找到</p>
          <h1 class="heading-1" style="margin-block: 24px">这个品牌<br />还没有展馆。</h1>
          <MuseumButton to="/brands">所有品牌</MuseumButton>
        </div>
      </GlassCard>
    </section>

    <p v-else-if="status === 'loading'" class="label" style="padding-block: 160px">
      展厅开放中……
    </p>

    <template v-else-if="brand">
      <!-- ====== 铭牌 HERO ====== -->
      <header class="brand__hero">
        <p class="label">品牌展馆 · 创立于 {{ brand.foundedYear ?? '—' }} · {{ brand.country ?? '' }}</p>
        <h1 class="brand__name">{{ brand.name }}<span class="brand__name-en mono">{{ brand.nameEn }}</span></h1>
        <p v-if="brand.motto" class="brand__motto body-lg">「{{ brand.motto }}」</p>
        <p v-if="brand.status" class="brand__status label">{{ brand.status }}</p>
      </header>

      <!-- ====== 关键数字 ====== -->
      <section v-if="brand.highlights?.length" class="brand__section">
        <p class="label brand__section-label">关键数字</p>
        <div class="brand__highlights">
          <GlassCard v-for="h in brand.highlights" :key="h.label" class="brand__highlight">
            <p class="brand__highlight-value mono">{{ h.value }}</p>
            <p class="brand__highlight-label label">{{ h.label }}</p>
          </GlassCard>
        </div>
      </section>

      <!-- ====== 品牌故事 ====== -->
      <section v-if="brand.story || brand.description" class="brand__section">
        <p class="label brand__section-label">品牌故事</p>
        <GlassCard class="brand__story-card">
          <p class="brand__description body-lg">{{ brand.story ?? brand.description }}</p>
        </GlassCard>
      </section>

      <!-- ====== 年代 ====== -->
      <section class="brand__section">
        <p class="label brand__section-label">年代</p>
        <GlassCard class="brand__decades-card">
          <div class="brand__decades">
            <div v-for="[decade, lines] in decades" :key="decade" class="brand__decade">
              <p class="brand__decade-label mono">{{ decade }}s</p>
              <ul>
                <li v-for="line in lines" :key="line" class="body-md brand__decade-line">{{ line }}</li>
              </ul>
            </div>
          </div>
        </GlassCard>
      </section>

      <!-- ====== 代表展品 ====== -->
      <section class="brand__section">
        <p class="label brand__section-label">代表展品 · {{ phones.length }}</p>
        <GlassCard class="brand__phones-card">
          <nav class="brand__phones">
            <router-link
              v-for="p in phones"
              :key="p.id"
              :to="`/phone/${p.id}`"
              class="brand__phone"
              data-cursor="看展"
            >
            <span class="brand__phone-year mono">{{ p.releaseYear }}</span>
            <PhonePhoto :phone="p" thumb class="brand__phone-art" />
            <span class="brand__phone-name">{{ p.name }}</span>
              <span class="brand__phone-arrow mono" aria-hidden="true">→</span>
            </router-link>
          </nav>
        </GlassCard>
      </section>

      <!-- ====== 资料来源（规范 §68） ====== -->
      <footer v-if="brand.sources?.length" class="brand__sources">
        <p class="label">资料来源 · {{ brand.sources.join(' · ') }}</p>
      </footer>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.brand {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__missing {
    padding-block: 120px;
  }

  &__missing-inner {
    padding: $sp-8 $sp-6;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-2;
  }

  &__hero {
    .label {
      margin-bottom: $sp-4;
    }
  }

  &__name {
    font-size: clamp(52px, 12vw, 170px);
    font-weight: 200;
    line-height: 0.98;
    letter-spacing: -0.01em;

    &-en {
      display: block;
      font-size: clamp(13px, 1.6vw, 20px);
      font-weight: 400;
      letter-spacing: 0.3em;
      color: $c-text-3;
      margin-top: $sp-3;
    }
  }

  &__motto {
    margin-top: $sp-4;
    color: $c-accent;
  }

  &__status {
    display: inline-block;
    margin-top: $sp-4;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    font-size: 10px;
    color: $c-text-2;
  }

  &__section {
    margin-top: $sp-7;
  }

  &__section-label {
    display: inline-block;
    margin-bottom: $sp-3;
    font-size: 10px;
  }

  // 关键数字 —— 三块并排的玻璃展签
  &__highlights {
    display: grid;
    gap: $sp-3;
    grid-template-columns: 1fr;

    @include tablet {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__highlight {
    padding: $sp-5;

    &-value {
      font-size: clamp(18px, 2.4vw, 26px);
      font-weight: 500;
      letter-spacing: 0.02em;
      color: $c-text;
      word-break: keep-all;
    }

    &-label {
      margin-top: $sp-2;
      font-size: 10px;
      word-break: keep-all;
    }
  }

  &__story-card {
    padding: $sp-7 $sp-6;

    @include desktop {
      padding: $sp-8;
    }
  }

  &__description {
    max-width: 68ch;
    line-height: 1.9;
  }

  &__decades-card {
    padding: $sp-6;
  }

  &__decades {
    display: flex;
    flex-direction: column;
    gap: $sp-5;
  }

  &__decade {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: $sp-5;
    align-items: baseline;
  }

  &__decade-label {
    color: $c-accent;
    font-size: 14px;
  }

  &__decade-line {
    padding-block: 2px;
    word-break: keep-all;
  }

  &__phones-card {
    padding: $sp-4 $sp-5;
  }

  &__phones {
    display: flex;
    flex-direction: column;
  }

  &__phone {
    display: flex;
    align-items: center;
    gap: $sp-4;
    padding-block: $sp-3;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    transition: background 0.35s var(--ease-museum);

    &:first-child {
      border-top: none;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.04);

      .brand__phone-arrow {
        transform: translateX(6px);
        color: $c-text;
      }
    }
  }

  &__phone-year {
    color: $c-text-3;
    width: 52px;
    flex-shrink: 0;
    font-size: 13px;
  }

  &__phone-art {
    width: 30px;
    height: 40px;
    flex-shrink: 0;
  }

  &__phone-name {
    font-size: 16px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__phone-arrow {
    margin-left: auto;
    color: $c-text-3;
    transition: transform 0.35s var(--ease-museum), color 0.35s var(--ease-museum);
  }

  &__sources {
    margin-top: $sp-7;
    padding-top: $sp-5;
    border-top: 1px solid $c-line-soft;

    .label {
      font-size: 9px;
      line-height: 1.8;
      word-break: keep-all;
    }
  }
}
</style>
