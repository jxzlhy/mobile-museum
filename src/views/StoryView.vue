<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storyService } from '@/services/storyService'
import { phoneService } from '@/services/phoneService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import type { MuseumStory } from '@/data/stories'
import type { Phone } from '@/data/types'

// STORY DETAIL（V0.3 §16–§22）：
// COVER → INTRO → TIMELINE → KEY EXHIBITS → WHY IT MATTERED → LEGACY。
// 章节制：每章一个核心观点 + 1~2 个展品 + 少量文字（§64）。

const route = useRoute()
const story = ref<MuseumStory | null>(null)
const phonesById = ref<Map<string, Phone>>(new Map())
const status = ref<'loading' | 'ready' | 'error'>('loading')

useStageScene(() => new AmbientScene())

async function load() {
  status.value = 'loading'
  const s = await storyService.getStory(String(route.params.id ?? ''))
  if (!s) {
    status.value = 'error'
    document.title = '未找到专题 — 手机历史博物馆'
    return
  }
  story.value = s
  const all = await phoneService.getPhones()
  phonesById.value = new Map(all.map((p) => [p.id, p]))
  status.value = 'ready'
  document.title = `${s.titleZh} — 手机历史博物馆`
}

onMounted(load)
watch(
  () => route.params.id,
  (id, old) => {
    if (id && id !== old && route.name === 'story') void load()
  },
)

const featured = computed<Phone[]>(() => {
  const ids = story.value?.featuredPhoneIds ?? []
  return ids.map((id) => phonesById.value.get(id)).filter((p): p is Phone => Boolean(p))
})

const phoneOf = (id?: string) => (id ? phonesById.value.get(id) : undefined)
</script>

<template>
  <div class="page story">
    <p v-if="status === 'error'" class="label container" style="padding-block: 160px">
      专题未找到 · <router-link to="/explore/stories" style="border-bottom: 1px solid var(--museum-line)">返回专题列表</router-link>
    </p>

    <p v-else-if="status === 'loading'" class="label container" style="padding-block: 160px">布展中……</p>

    <template v-else-if="story">
      <!-- ====== COVER（规范 §17：展览海报） ====== -->
      <header class="story__cover">
        <div class="story__cover-text container">
          <p class="label">MUSEUM STORY · {{ story.period?.startYear }}{{ story.period?.endYear ? ' — ' + story.period.endYear : ' —' }}</p>
          <h1 class="story__title">{{ story.title }}</h1>
          <p class="story__zh">{{ story.titleZh }}</p>
        </div>
      </header>

      <!-- ====== INTRO（§18） ====== -->
      <section class="story__block container">
        <p class="story__intro">{{ story.intro }}</p>
      </section>

      <!-- ====== TIMELINE（§19） ====== -->
      <section class="story__block container">
        <p class="label story__label">时间轴 · TIMELINE</p>
        <ol class="story__timeline">
          <li v-for="e in story.timeline" :key="e.year + e.title" class="story__event">
            <p class="story__event-year mono">{{ e.year }}</p>
            <div>
              <template v-if="phoneOf(e.phoneId)">
                <router-link :to="`/phone/${e.phoneId}`" class="story__event-title" data-cursor="看展">
                  {{ e.title }} →
                </router-link>
              </template>
              <h3 v-else class="story__event-title">{{ e.title }}</h3>
              <p v-if="e.description" class="body-md story__event-desc">{{ e.description }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- ====== KEY EXHIBITS（§20）：真实图为主角 ====== -->
      <section class="story__block container">
        <p class="label story__label">重点展品 · KEY EXHIBITS</p>
        <div class="story__exhibits">
          <router-link
            v-for="(p, i) in featured"
            :key="p.id"
            :to="`/phone/${p.id}`"
            class="story__exhibit"
            data-cursor="看展"
          >
            <span class="story__exhibit-photo">
              <PhonePhoto :phone="p" mark-missing />
            </span>
            <span class="story__exhibit-index mono">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="story__exhibit-name">{{ p.name }}</span>
            <span class="label story__exhibit-year">{{ p.releaseYear }} · {{ p.brandName }}</span>
          </router-link>
        </div>
      </section>

      <!-- ====== WHY IT MATTERED（§21）：情绪高潮，留白停顿 ====== -->
      <section class="story__why">
        <div class="container">
          <p class="story__why-head label">WHY IT MATTERED</p>
          <p class="story__why-text">{{ story.whyItMattered }}</p>
        </div>
      </section>

      <!-- ====== LEGACY（§22）：WHAT REMAINED ====== -->
      <section class="story__block container">
        <p class="label story__label">WHAT REMAINED · 遗产</p>
        <div class="story__legacy">
          <p v-for="line in story.legacy ?? []" :key="line" class="story__legacy-line">{{ line }}</p>
        </div>
      </section>

      <!-- ====== 页脚导航 ====== -->
      <footer class="story__foot container">
        <MuseumButton to="/explore/stories" variant="line">全部专题</MuseumButton>
        <MuseumButton to="/explore/evolution" variant="line">进入演化长卷</MuseumButton>
      </footer>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.story {
  padding-bottom: $sp-10;

  &__cover {
    min-height: 78vh;
    min-height: 78dvh;
    display: flex;
    align-items: flex-end;
    padding-block: $sp-9 $sp-8;
    padding-top: calc(120px + env(safe-area-inset-top));
    background: radial-gradient(ellipse 90% 60% at 70% 20%, rgba(255, 255, 255, 0.05), transparent 65%);
  }

  &__title {
    margin-top: $sp-4;
    font-size: clamp(38px, 8vw, 96px);
    font-weight: 200;
    line-height: 1.02;
    letter-spacing: 0.02em;
  }

  &__zh {
    margin-top: $sp-3;
    font-size: clamp(16px, 2.4vw, 24px);
    color: $c-text-2;
    letter-spacing: 0.3em;
    word-break: keep-all;
  }

  &__block {
    margin-top: $sp-9;
  }

  &__label {
    margin-bottom: $sp-5;
    font-size: 10px;
  }

  &__intro {
    font-size: clamp(20px, 3vw, 32px);
    font-weight: 250;
    line-height: 1.5;
    max-width: 26ch;
    word-break: keep-all;
  }

  // 时间轴
  &__timeline {
    display: flex;
    flex-direction: column;
    gap: $sp-5;
    max-width: 640px;
  }

  &__event {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: $sp-5;
    align-items: baseline;
  }

  &__event-year {
    color: $c-accent;
    font-size: 14px;
  }

  &__event-title {
    font-size: 17px;
    font-weight: 400;
    word-break: keep-all;
  }

  a.story__event-title:hover {
    color: $c-text;
  }

  &__event-desc {
    margin-top: $sp-1;
    word-break: keep-all;
  }

  // 展品：图为主角（§94：少边框、留白 + 年份 + 标签）
  &__exhibits {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $sp-5;

    @include desktop {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
  }

  &__exhibit {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $sp-2;
    padding: $sp-6 $sp-4;
    text-align: center;

    .story__exhibit-photo {
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;

      :deep(img),
      :deep(.phone-photo__silhouette) {
        max-height: 100%;
        transition: transform 0.5s var(--ease-museum);
        filter: drop-shadow(0 16px 36px rgba(0, 0, 0, 0.55));
      }
    }

    &:hover .story__exhibit-photo :deep(img),
    &:hover .story__exhibit-photo :deep(.phone-photo__silhouette) {
      transform: translateY(-6px);
    }

    &-index {
      margin-top: $sp-3;
      color: $c-accent;
      font-size: 10px;
      letter-spacing: 0.3em;
    }

    &-name {
      font-size: 15px;
      font-weight: 350;
      word-break: keep-all;
    }

    &-year {
      font-size: 9px;
    }
  }

  // WHY IT MATTERED —— 大留白停顿
  &__why {
    margin-top: $sp-10;
    padding-block: $sp-10;
    background: rgba(255, 255, 255, 0.02);

    &-head {
      margin-bottom: $sp-6;
      font-size: 10px;
    }
  }

  &__why-text {
    font-size: clamp(24px, 4vw, 48px);
    font-weight: 250;
    line-height: 1.4;
    max-width: 24ch;
    word-break: keep-all;
  }

  &__legacy {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
  }

  &__legacy-line {
    font-size: clamp(18px, 2.6vw, 28px);
    font-weight: 200;
    color: $c-text-2;
    word-break: keep-all;
  }

  &__foot {
    margin-top: $sp-9;
    display: flex;
    gap: $sp-5;
    flex-wrap: wrap;
  }
}
</style>
