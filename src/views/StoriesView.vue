<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storyService } from '@/services/storyService'
import { phoneService } from '@/services/phoneService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import type { MuseumStory } from '@/data/stories'
import type { Phone } from '@/data/types'


// MUSEUM STORIES 列表（V0.3 §14 / §17）：每个专题像一张展览海报。

useStageScene(() => new AmbientScene())

const stories = ref<MuseumStory[]>([])
const phones = ref<Phone[]>([])
const loading = ref(true)

onMounted(async () => {
  const [s, p] = await Promise.all([storyService.getStories(), phoneService.getPhones()])
  stories.value = s
  phones.value = p
  loading.value = false
})

function coverPhone(story: MuseumStory): Phone | undefined {
  for (const id of story.featuredPhoneIds ?? []) {
    const p = phones.value.find((x) => x.id === id)
    if (p && (p.assets?.hero?.status === 'approved' || p.formFactor)) return p
  }
  return undefined
}

function periodText(story: MuseumStory): string {
  const s = story.period?.startYear
  const e = story.period?.endYear
  if (!s) return ''
  return e ? `${s} — ${e}` : `${s} —`
}
</script>

<template>
  <div class="page stories container">
    <header class="stories__head">
      <p class="label">MUSEUM STORIES · 专题展览</p>
      <h1 class="heading-1" style="margin-top: 16px">博物馆<br />故事</h1>
      <p class="body-lg stories__intro">移动时代的七个篇章——每个专题都是一场独立的展览。</p>
    </header>

    <p v-if="loading" class="label" style="padding-block: 64px">布展中……</p>

    <nav v-else class="stories__list">
      <router-link
        v-for="(s, i) in stories"
        :key="s.id"
        :to="`/explore/stories/${s.id}`"
        class="stories__poster"
        data-cursor="开展"
      >
        <div class="stories__poster-text">
          <span class="stories__index mono">{{ String(i + 1).padStart(2, '0') }}</span>
          <h2 class="stories__title">{{ s.title }}</h2>
          <p class="stories__zh">{{ s.titleZh }}</p>
          <p class="stories__period mono">{{ periodText(s) }}</p>
        </div>
        <div class="stories__poster-art">
          <PhonePhoto v-if="coverPhone(s)" :phone="coverPhone(s)!" />
        </div>
      </router-link>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
.stories {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head {
    .label {
      margin-bottom: $sp-2;
    }
  }

  &__intro {
    margin-top: $sp-4;
    max-width: 40ch;
  }

  &__list {
    margin-top: $sp-8;
    display: flex;
    flex-direction: column;
    gap: $sp-5;
  }

  // 海报式条目（§17）：不是卡片
  &__poster {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: $sp-5;
    padding: $sp-7 $sp-6;
    border: 1px solid $c-line-soft;
    border-radius: 18px;
    transition: border-color 0.4s var(--ease-museum), background 0.4s var(--ease-museum);

    &:hover {
      border-color: $c-line;
      background: rgba(255, 255, 255, 0.03);

      .stories__poster-art :deep(img),
      .stories__poster-art :deep(.phone-photo__silhouette) {
        transform: scale(1.04) rotate(-1deg);
      }
    }
  }

  &__index {
    color: $c-accent;
    font-size: 11px;
    letter-spacing: 0.3em;
  }

  &__title {
    margin-top: $sp-3;
    font-size: clamp(22px, 3.6vw, 40px);
    font-weight: 200;
    line-height: 1.05;
    letter-spacing: 0.02em;
  }

  &__zh {
    margin-top: $sp-2;
    color: $c-text-2;
    font-size: 15px;
    word-break: keep-all;
  }

  &__period {
    margin-top: $sp-3;
    color: $c-text-3;
    font-size: 11px;
    letter-spacing: 0.2em;
  }

  &__poster-art {
    width: 120px;
    height: 190px;
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(img),
    :deep(.phone-photo__silhouette) {
      max-height: 100%;
      transition: transform 0.5s var(--ease-museum);
      filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.55));
    }
  }
}
</style>
