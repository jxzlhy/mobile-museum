<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { curatorService } from '@/services/curator/curatorService'
import { buildPublicExhibition, savePublicToMyMuseum, type PublicExhibition } from '@/services/publicExhibition'
import { shareCard } from '@/services/shareCard'
import { getRenderer } from '@/components/curator/blocks'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { memoryService } from '@/services/memoryService'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import QrCode from '@/components/curator/QrCode.vue'

// PUBLIC EXHIBITION（V0.9 规范 §4–§12 / §31 / §43–§44）：
// 分享链接直达的只读展览 —— 分页浏览（§10–§12）、
// SAVE TO MY MUSEUM 克隆副本（§8–§9）、EXPLORE MOBILE MUSEUM 入口（§43）。
// 无需账号；payload 只含引用（§6），坏引用降级不白屏（§35/§75）。

useStageScene(() => new AmbientScene())

const route = useRoute()
const router = useRouter()
const reduced = useReducedMotion()

const pub = ref<PublicExhibition | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const page = ref(0)
const qrOpen = ref(false)
const cardNote = ref('')
const savedId = ref<string | null>(null)
const savedNote = ref(false)

const url = computed(() => `${location.origin}${location.pathname}#/exhibition/share/${route.params.payload ?? ''}`)

const slides = computed(() => pub.value?.slides ?? [])
const total = computed(() => slides.value.length)
const current = computed(() => slides.value[page.value] ?? null)
const isCover = computed(() => current.value?.kind === 'cover')
const isEnd = computed(() => current.value?.kind === 'end')
const currentBlock = computed(() => (current.value?.kind === 'block' ? current.value.block : null))

async function load() {
  status.value = 'loading'
  const payload = String(route.params.payload ?? '')
  const parsed = await curatorService.parseShareUrl(payload)
  if (!parsed) {
    status.value = 'error'
    document.title = '展览链接无效 — 手机历史博物馆'
    return
  }
  pub.value = await buildPublicExhibition(parsed)
  const q = Number(route.query.page)
  page.value = Number.isFinite(q) && q >= 0 && q < total.value ? q : 0
  status.value = 'ready'
  document.title = `${parsed.title} · 公开展览 — 手机历史博物馆`
  // 首个展品计入最近访问（不写 discovery —— 状态分离 §26/§46）
  const firstExhibit = parsed.blocks.find((b) => b.type === 'exhibit')
  const pid = (firstExhibit?.data as { phoneId?: string })?.phoneId
  if (pid) memoryService.visit(pid)
}

function go(delta: -1 | 1) {
  const next = page.value + delta
  if (next < 0 || next >= total.value) return
  page.value = next
  router.replace({ query: { ...route.query, page: String(next) } })
  window.scrollTo(0, 0)
}

async function saveToMyMuseum() {
  if (!pub.value) return
  const payload = await curatorService.parseShareUrl(String(route.params.payload ?? ''))
  if (!payload) return
  const id = await savePublicToMyMuseum(payload)
  if (id) {
    savedId.value = id
    savedNote.value = true
    setTimeout(() => (savedNote.value = false), 3000)
  }
}

async function doShareCard() {
  if (!pub.value) return
  const result = await shareCard(pub.value.title, url.value, {
    title: pub.value.title,
    subtitle: pub.value.subtitle,
    coverPhoneId: pub.value.coverPhone?.id,
  })
  cardNote.value = result === 'shared' ? '已唤起分享' : result === 'downloaded' ? '分享卡已下载' : '分享卡生成失败'
  setTimeout(() => (cardNote.value = ''), 3000)
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(url.value)
    cardNote.value = '链接已复制'
  } catch {
    cardNote.value = url.value
  }
  setTimeout(() => (cardNote.value = ''), 3000)
}

async function nativeShare() {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
  if (nav.share) {
    try {
      await nav.share({ title: pub.value?.title ?? 'MOBILE MUSEUM', url: url.value })
      return
    } catch {
      /* 用户取消 */
    }
  }
  await copyLink()
}

function onKeydown(e: KeyboardEvent) {
  if (qrOpen.value) {
    if (e.key === 'Escape') qrOpen.value = false
    return
  }
  if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'Escape') router.push('/museum')
}

onMounted(() => {
  void load()
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
watch(() => route.params.payload, () => void load())
</script>

<template>
  <div class="pub" :class="{ 'pub--reduced': reduced }">
    <p v-if="status === 'loading'" class="label pub__loading">正在布展……</p>

    <section v-else-if="status === 'error'" class="pub__missing container">
      <div class="glass-card pub__missing-card">
        <p class="mono">EXHIBITION LINK INVALID</p>
        <h1 class="heading-2" style="margin-block: 16px">这个展览链接<br />无法打开。</h1>
        <MuseumButton to="/museum" variant="cta">EXPLORE MOBILE MUSEUM</MuseumButton>
      </div>
    </section>

    <template v-else-if="pub">
      <!-- HUD -->
      <header class="pub__hud">
        <button class="pub__exit label" @click="router.push('/museum')">EXIT</button>
        <p class="mono pub__count" aria-live="polite">{{ String(page + 1).padStart(2, '0') }} / {{ String(total).padStart(2, '0') }}</p>
      </header>

      <main class="pub__stage container">
        <transition :name="reduced ? 'pubfade' : 'pubslide'" mode="out-in">
          <!-- COVER（§10 Public Hero） -->
          <section v-if="isCover" key="cover" class="pub__cover">
            <p class="label mono pub__cover-theme">CURATED EXHIBITION · 公开策展</p>
            <div class="pub__cover-art">
              <PhonePhoto v-if="pub.coverPhone" :phone="pub.coverPhone" />
              <span v-else class="pub__cover-abs" aria-hidden="true">◫</span>
            </div>
            <h1 class="pub__title">{{ pub.title }}</h1>
            <p v-if="pub.subtitle" class="body-lg pub__subtitle">{{ pub.subtitle }}</p>
            <p v-if="pub.intro" class="body-md pub__intro">{{ pub.intro }}</p>
            <p class="label pub__curator">CURATED BY YOU · MOBILE MUSEUM</p>
            <MuseumButton v-if="pub.slides.length > 2" variant="cta" @click="go(1)">START EXHIBITION →</MuseumButton>
          </section>

          <!-- Block 页 -->
          <section v-else-if="currentBlock" :key="currentBlock.id" class="pub__block-page">
            <p class="label mono pub__block-idx">{{ String(page).padStart(2, '0') }} · {{ currentBlock.type.toUpperCase() }}</p>
            <component :is="getRenderer(currentBlock.type)" v-if="getRenderer(currentBlock.type)" :block="currentBlock" interactive />
            <p v-else class="mono pub__unavailable">CONTENT UNAVAILABLE</p>
          </section>

          <!-- END（§12） -->
          <section v-else key="end" class="pub__end">
            <p class="label mono pub__end-mark">END OF EXHIBITION</p>
            <h2 class="pub__end-title">{{ pub.title }}</h2>
            <div class="pub__end-actions">
              <MuseumButton to="/museum" variant="cta">EXPLORE MOBILE MUSEUM</MuseumButton>
              <button class="pub__btn label" @click="saveToMyMuseum">SAVE TO MY MUSEUM</button>
            </div>
            <p v-if="savedNote" class="label pub__saved" role="status">
              已保存副本<template v-if="savedId"> · <router-link :to="`/curator/${savedId}`">在 Curator Studio 打开 →</router-link></template>
            </p>
          </section>
        </transition>
      </main>

      <!-- 分享动作（§16：Web Share → Clipboard → Manual） -->
      <nav class="pub__share container" aria-label="分享展览">
        <button class="pub__share-btn label" @click="nativeShare">SHARE</button>
        <button class="pub__share-btn label" @click="copyLink">COPY LINK</button>
        <button class="pub__share-btn label" @click="doShareCard">SHARE CARD</button>
        <button class="pub__share-btn label" @click="qrOpen = true">QR CODE</button>
      </nav>
      <p v-if="cardNote" class="label pub__note" role="status">{{ cardNote }}</p>

      <!-- Prev / Next（§11） -->
      <nav class="pub__nav" aria-label="展览翻页">
        <button class="pub__navbtn" :disabled="page === 0" @click="go(-1)">← PREVIOUS</button>
        <button v-if="page < total - 1" class="pub__navbtn pub__navbtn--primary" @click="go(1)">NEXT →</button>
        <button v-else class="pub__navbtn pub__navbtn--primary" @click="router.push('/museum')">完成 · 探索博物馆</button>
      </nav>

      <!-- QR（§19–§21） -->
      <div v-if="qrOpen" class="pub__qr" role="dialog" aria-label="展览二维码" @click.self="qrOpen = false">
        <div class="pub__qr-card glass-card">
          <p class="label">SCAN TO VISIT · 扫码参观</p>
          <QrCode :url="url" :size="280" />
          <button class="pub__btn label" @click="qrOpen = false">关闭</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.pub {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-top: calc(64px + env(safe-area-inset-top));

  &__loading {
    padding: 160px $page-pad-x;
  }

  &__missing {
    padding-block: 140px;

    &-card {
      max-width: 440px;
      padding: $sp-7 $sp-6;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: $sp-3;

      .mono {
        font-size: 11px;
        letter-spacing: 0.2em;
        color: $c-text-3;
      }
    }
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
    height: 200px;
    display: flex;
    align-items: center;
    margin-block: $sp-2;

    :deep(.phone-photo__img) {
      max-height: 190px;
      object-fit: contain;
    }
  }

  &__cover-abs {
    font-size: 52px;
    color: $c-text-3;
  }

  &__title {
    font-size: clamp(32px, 6vw, 60px);
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
    margin-top: $sp-3;
    font-size: 8px;
    color: $c-text-3;
    letter-spacing: 0.28em;
  }

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

  &__end-actions {
    margin-top: $sp-4;
    display: flex;
    gap: $sp-3;
    flex-wrap: wrap;
    justify-content: center;
  }

  &__btn {
    padding: $sp-3 $sp-5;
    border: 1px solid $c-line;
    border-radius: 999px;
    color: $c-text;
    @include label-style(11px);

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  &__saved {
    color: $c-accent;

    a {
      border-bottom: 1px solid rgba(184, 178, 164, 0.5);
    }
  }

  &__share {
    display: flex;
    gap: $sp-2;
    flex-wrap: wrap;
    padding-block: $sp-4;
  }

  &__share-btn {
    font-size: 9px;
    padding: 8px 14px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-2;
    letter-spacing: 0.14em;

    &:hover {
      color: $c-accent;
      border-color: rgba(184, 178, 164, 0.4);
    }
  }

  &__note {
    padding-inline: $page-pad-x;
    font-size: 10px;
    color: $c-accent;
    word-break: break-all;
  }

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

  &__qr {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(4, 4, 4, 0.7);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);

    &-card {
      width: min(400px, 90vw);
      padding: $sp-6;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $sp-4;
      background: rgba(12, 12, 12, 0.94);
    }
  }
}

.pubslide-enter-active,
.pubslide-leave-active {
  transition: opacity 0.4s var(--ease-museum), transform 0.4s var(--ease-museum);
}

.pubslide-enter-from {
  opacity: 0;
  transform: translateY(24px);
}

.pubslide-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}

.pubfade-enter-active,
.pubfade-leave-active {
  transition: opacity 0.15s linear;
}

.pubfade-enter-from,
.pubfade-leave-to {
  opacity: 0;
}
</style>
