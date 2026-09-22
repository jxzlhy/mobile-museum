<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { curatorService } from '@/services/curator/curatorService'
import { getRenderer } from '@/components/curator/blocks'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { phoneService } from '@/services/phoneService'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import type { CuratedExhibition, ExhibitionBlock } from '@/services/curator/types'

// Exhibition Preview（V0.8 规范 §23–§25 / §51 / §53 / §60–§61）：
// 独立数字展览：Cover → Intro → Blocks → END。
// 分页浏览：03 / 08 + Previous / Next / Exit；不出现任何编辑控件。
// Lazy：只渲染当前页（3D 仅当前 Block 需要时加载，§50–§51）。

useStageScene(() => new AmbientScene())

const route = useRoute()
const router = useRouter()
const reduced = useReducedMotion()

const ex = ref<CuratedExhibition | null>(null)
const coverPhone = ref<Awaited<ReturnType<typeof phoneService.getPhoneById>>>()
const page = ref(0)
const status = ref<'loading' | 'ready' | 'error'>('loading')

// slides: 0 = cover, 1..N = blocks, N+1 = end
const slides = computed(() => {
  if (!ex.value) return []
  return ['cover', ...ex.value.blocks.map((b) => b.id), 'end'] as Array<'cover' | 'end' | string>
})
const total = computed(() => slides.value.length)
const currentBlock = computed<ExhibitionBlock | null>(() => {
  const key = slides.value[page.value]
  if (!key || key === 'cover' || key === 'end') return null
  return ex.value?.blocks.find((b) => b.id === key) ?? null
})
const isCover = computed(() => slides.value[page.value] === 'cover')
const isEnd = computed(() => slides.value[page.value] === 'end')

async function load() {
  const id = String(route.params.id ?? '')
  const stored = curatorService.getById(id)
  const draft = curatorService.getDraft(id)
  const e = draft && stored && draft.updatedAt > stored.updatedAt ? draft : stored
  if (!e) {
    status.value = 'error'
    return
  }
  ex.value = e
  if (e.coverPhoneId) coverPhone.value = await phoneService.getPhoneById(e.coverPhoneId)
  // ?page=n 恢复
  const q = Number(route.query.page)
  page.value = Number.isFinite(q) && q >= 0 && q < total.value ? q : 0
  status.value = 'ready'
  document.title = `${e.title} · 个人展览 — 手机历史博物馆`
}

function go(delta: -1 | 1) {
  const next = page.value + delta
  if (next < 0 || next >= total.value) return
  page.value = next
  router.replace({ query: { ...route.query, page: String(next) } })
  window.scrollTo(0, 0)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'Escape') exit()
}

function exit() {
  router.push('/curator')
}

function share() {
  void (async () => {
    if (!ex.value) return
    const result = await curatorService.buildShareUrl(ex.value)
    if (result.ok) {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
      if (nav.share) {
        try {
          await nav.share({ title: ex.value!.title, url: result.url })
          return
        } catch {
          /* 继续复制 */
        }
      }
      void navigator.clipboard.writeText(result.url).catch(() => {})
    }
  })()
}

onMounted(() => {
  void load()
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="pv" :class="{ 'pv--reduced': reduced }">
    <p v-if="status === 'loading'" class="label pv__loading">正在布展……</p>

    <section v-else-if="status === 'error'" class="pv__missing container">
      <p class="mono">EXHIBITION UNAVAILABLE</p>
      <button class="label pv__back" @click="exit">← 回到 CURATOR STUDIO</button>
    </section>

    <template v-else-if="ex">
      <!-- 页码指示（§25） -->
      <header class="pv__hud">
        <button class="pv__exit label" @click="exit">EXIT</button>
        <p class="mono pv__count" aria-live="polite">{{ String(page + 1).padStart(2, '0') }} / {{ String(total).padStart(2, '0') }}</p>
      </header>

      <main class="pv__stage container">
        <!-- COVER -->
        <transition :name="reduced ? 'pvfade' : 'pvslide'" mode="out-in">
          <section v-if="isCover" key="cover" class="pv__cover">
            <p class="label mono pv__cover-theme">{{ ex.theme?.toUpperCase() ?? 'A PERSONAL EXHIBITION' }}</p>
            <div class="pv__cover-art">
              <PhonePhoto v-if="coverPhone" :phone="coverPhone" />
              <span v-else class="pv__cover-abs" aria-hidden="true">◫</span>
            </div>
            <h1 class="pv__title">{{ ex.title }}</h1>
            <p v-if="ex.subtitle" class="body-lg pv__subtitle">{{ ex.subtitle }}</p>
            <p v-if="ex.intro" class="body-md pv__intro">{{ ex.intro }}</p>
            <p class="label pv__curator">CURATED BY YOU · MOBILE MUSEUM</p>
          </section>

          <!-- BLOCK 页 -->
          <section v-else-if="currentBlock" :key="currentBlock.id" class="pv__block-page">
            <p class="label mono pv__block-idx">
              {{ String(page).padStart(2, '0') }} · {{ currentBlock.type.toUpperCase() }}
            </p>
            <component :is="getRenderer(currentBlock.type)" v-if="getRenderer(currentBlock.type)" :block="currentBlock" interactive />
            <p v-else class="mono pv__unavailable">CONTENT UNAVAILABLE</p>
          </section>

          <!-- END（§61） -->
          <section v-else key="end" class="pv__end">
            <p class="label mono pv__end-mark">END OF EXHIBITION</p>
            <h2 class="pv__end-title">{{ ex.title }}</h2>
            <p class="body-md pv__end-note">Curated with<br />MOBILE MUSEUM</p>
            <div class="pv__end-actions">
              <button class="pv__btn" @click="exit">BACK TO MY MUSEUM</button>
              <button class="pv__btn pv__btn--accent" @click="share">SHARE</button>
            </div>
          </section>
        </transition>
      </main>

      <!-- Prev / Next（§25） -->
      <nav class="pv__nav" aria-label="展览翻页">
        <button class="pv__navbtn" :disabled="page === 0" @click="go(-1)">← PREVIOUS</button>
        <button v-if="page < total - 1" class="pv__navbtn pv__navbtn--primary" @click="go(1)">NEXT →</button>
        <button v-else class="pv__navbtn pv__navbtn--primary" @click="exit">完成 · EXIT</button>
      </nav>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.pv {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-top: calc(64px + env(safe-area-inset-top));

  &__loading {
    padding: 160px $page-pad-x;
  }

  &__missing {
    padding-block: 160px;

    .mono {
      font-size: 12px;
      color: $c-text-3;
      letter-spacing: 0.2em;
    }
  }

  &__back {
    display: inline-block;
    margin-top: $sp-4;
    color: $c-accent;
  }

  &__hud {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $sp-3 $page-pad-x;
  }

  &__exit {
    color: $c-text-3;

    &:hover {
      color: $c-text;
    }
  }

  &__count {
    font-size: 11px;
    color: $c-text-2;
    letter-spacing: 0.25em;
  }

  &__stage {
    flex: 1;
    display: flex;
    align-items: center;
    padding-block: $sp-6;
  }

  // ---- Cover ----
  &__cover {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: $sp-3;
  }

  &__cover-theme {
    font-size: 9px;
    color: $c-accent;
    letter-spacing: 0.3em;
  }

  &__cover-art {
    height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-block: $sp-3;

    :deep(.phone-photo__img) {
      max-height: 210px;
      object-fit: contain;
    }
  }

  &__cover-abs {
    font-size: 56px;
    color: $c-text-3;
  }

  &__title {
    font-size: clamp(34px, 6vw, 64px);
    font-weight: 250;
    line-height: 1.1;
    word-break: keep-all;
  }

  &__subtitle {
    color: $c-text-2;
  }

  &__intro {
    max-width: 40ch;
    color: $c-text-3;
    line-height: 1.8;
  }

  &__curator {
    margin-top: $sp-4;
    font-size: 8px;
    color: $c-text-3;
    letter-spacing: 0.28em;
  }

  // ---- Block 页 ----
  &__block-page {
    width: 100%;
    max-width: 640px;
    margin-inline: auto;
  }

  &__block-idx {
    font-size: 9px;
    color: $c-text-3;
    letter-spacing: 0.24em;
    margin-bottom: $sp-5;
  }

  &__unavailable {
    font-size: 11px;
    color: $c-text-3;
    letter-spacing: 0.15em;
  }

  // ---- End ----
  &__end {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: $sp-3;
  }

  &__end-mark {
    font-size: 10px;
    color: $c-accent;
    letter-spacing: 0.3em;
  }

  &__end-title {
    font-size: clamp(26px, 4vw, 40px);
    font-weight: 250;
    word-break: keep-all;
  }

  &__end-note {
    color: $c-text-3;
    line-height: 1.8;
  }

  &__end-actions {
    margin-top: $sp-5;
    display: flex;
    gap: $sp-3;
    flex-wrap: wrap;
    justify-content: center;
  }

  &__btn {
    padding: $sp-3 $sp-6;
    border: 1px solid $c-line;
    border-radius: 999px;
    color: $c-text;
    @include label-style(11px);
    letter-spacing: 0.14em;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    &--accent {
      border-color: rgba(184, 178, 164, 0.55);
      color: $c-accent;
    }
  }

  // ---- 翻页导航 ----
  &__nav {
    display: flex;
    justify-content: space-between;
    padding: $sp-4 $page-pad-x calc($sp-6 + env(safe-area-inset-bottom));
  }

  &__navbtn {
    padding: $sp-3 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    @include label-style(10px);
    color: $c-text-3;

    &:hover:not(:disabled) {
      color: $c-text;
    }

    &:disabled {
      opacity: 0.25;
    }

    &--primary {
      border-color: rgba(184, 178, 164, 0.5);
      color: $c-accent;
    }
  }
}

.pvslide-enter-active,
.pvslide-leave-active {
  transition: opacity 0.4s var(--ease-museum), transform 0.4s var(--ease-museum);
}

.pvslide-enter-from {
  opacity: 0;
  transform: translateY(24px);
}

.pvslide-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}

.pvfade-enter-active,
.pvfade-leave-active {
  transition: opacity 0.15s linear;
}

.pvfade-enter-from,
.pvfade-leave-to {
  opacity: 0;
}
</style>
