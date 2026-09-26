<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Stage } from '@/three/core/Stage'
import { HomeScene } from '@/three/scenes/HomeScene'
import { HomeAnimation, HOME_PHASES } from '@/animations/home/HomeAnimation'
import { useMuseum } from '@/composables/useMuseum'
import { useStageScene } from '@/composables/useStageScene'
import { getSmoothScroll } from '@/composables/useSmoothScroll'
import PhoneSilhouette from '@/components/common/PhoneSilhouette.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import { sessionService, type MuseumSession } from '@/services/sessionService'

// 博物馆入口（规范 §11–§12）：站在一座数字博物馆的门前。

const museum = useMuseum()
const heroEl = ref<HTMLElement>()
const session = ref<MuseumSession | null>(null)
let animation: HomeAnimation | null = null
let scene: HomeScene | null = null

onMounted(() => {
  // CONTINUE EXPLORING（V0.9 §40：有最近会话才显示；§77：不自动跳转）
  session.value = sessionService.getSession()
})

useStageScene(() => {
  scene = new HomeScene()
  return scene
})

onMounted(() => {
  if (heroEl.value) {
    animation = new HomeAnimation({
      heroEl: heroEl.value,
      scene: Stage.activeScene instanceof HomeScene ? (Stage.activeScene as HomeScene) : null,
      reduced: museum.state.motionMode === 'reduced',
    })
  }
})

onUnmounted(() => {
  animation?.destroy()
  animation = null
  scene = null
})

watch(
  () => museum.state.entered,
  (entered) => {
    if (entered && scene) scene.enter()
  },
  { immediate: true },
)

function enterJourney() {
  const target = window.innerHeight * 1.05
  const lenis = getSmoothScroll()
  if (lenis) lenis.scrollTo(target, { duration: 1.6 })
  else window.scrollTo({ top: target, behavior: 'smooth' })
}

const galleries = [
  { index: '01', to: '/timeline', name: '时间长廊', note: '走过 1973 — 2026 的五十余年' },
  { index: '02', to: '/phones', name: '全部藏品', note: '五十台真实设备的藏品总目' },
  { index: '03', to: '/technology', name: '技术馆', note: '六个章节，看懂一部手机的进化' },
  { index: '04', to: '/brands', name: '品牌馆', note: '十六个塑造行业的名字' },
  { index: '05', to: '/form-factor', name: '形态馆', note: '砖块、翻盖、滑盖，直到折叠屏' },
  { index: '06', to: '/collection', name: '我的手机史', note: '策划属于你自己的移动岁月' },
]
</script>

<template>
  <div class="page home">
    <!-- ====== 入口大厅 —— 钉住区域，滚动即镜头移动 ====== -->
    <section ref="heroEl" class="hero">
      <div class="hero__inner container" data-cursor="SCROLL">
        <header class="hero__head">
          <h1 class="hero__title">手机历史<br />博物馆</h1>
        </header>

        <!-- 滚动叙事：镜头移动，年份交替浮现 -->
        <div class="phases" aria-live="polite">
          <div v-for="phase in HOME_PHASES" :key="phase.year" class="phase">
            <p class="phase__year year-display">{{ phase.year }}</p>
            <p class="phase__text label label--light">{{ phase.text }}</p>
          </div>
        </div>

        <footer class="hero__foot">
          <p class="hero__sub label">移动通信的历史 · A DIGITAL MUSEUM</p>
          <p class="hero__years mono">1973 — 2026</p>
          <MuseumButton variant="cta" size="lg" @click="enterJourney">进入博物馆 ↓</MuseumButton>
          <p class="hero__hint label">向下滚动，开始逛展</p>
        </footer>
      </div>

      <!-- 无 WebGL → 静态档案图版回退（规范 §78） -->
      <PhoneSilhouette v-if="!museum.state.webgl" form="brick" class="hero__fallback" />
    </section>

    <!-- ====== CONTINUE EXPLORING（V0.9 §40–§42 / §77：用户主动点击恢复）====== -->
    <section v-if="session" class="continue container">
      <router-link :to="session.route" class="continue__card glass-card" data-cursor="继续">
        <span class="label mono continue__mark">CONTINUE EXPLORING · 继续参观</span>
        <span class="continue__label">{{ session.label ?? session.route }}</span>
        <span class="mono continue__arrow" aria-hidden="true">→</span>
      </router-link>
    </section>

    <!-- ====== 展厅索引 ====== -->
    <section class="galleries container">
      <p class="label">展馆一览</p>
      <nav class="galleries__list" aria-label="展厅导航">
        <router-link
          v-for="g in galleries"
          :key="g.to"
          :to="g.to"
          class="galleries__row"
          data-cursor="探索"
        >
          <span class="galleries__index mono">{{ g.index }}</span>
          <span class="galleries__name heading-2">{{ g.name }}</span>
          <span class="galleries__note body-md">{{ g.note }}</span>
          <span class="galleries__arrow mono" aria-hidden="true">→</span>
        </router-link>
      </nav>

      <footer class="home__foot hairline-top">
        <p class="label">手机历史博物馆 · 始于 1973</p>
        <p class="label">一部手机，不只是一台手机</p>
      </footer>
    </section>
  </div>
</template>

<style lang="scss" scoped>
// ---------- CONTINUE ----------
.continue {
  margin-top: $sp-8;

  &__card {
    display: flex;
    align-items: center;
    gap: $sp-4;
    padding: $sp-5 $sp-6;

    &:hover {
      border-color: rgba(184, 178, 164, 0.55);
    }
  }

  &__mark {
    font-size: 9px;
    color: $c-accent;
    letter-spacing: 0.24em;
    word-break: keep-all;
  }

  &__label {
    flex: 1;
    font-size: 16px;
    font-weight: 350;
    color: $c-text;
    word-break: keep-all;
  }

  &__arrow {
    color: $c-text-3;
  }
}

// ---------- 入口 ----------
.hero {
  position: relative;
  height: 100vh;
  height: 100dvh;

  &__inner {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    @include safe-top($sp-6);
    // 预留移动端底部浮动导航的高度（规范 §47）
    padding-block-end: calc(#{$sp-9} + env(safe-area-inset-bottom));

    @include desktop {
      padding-block-end: calc(#{$sp-5} + env(safe-area-inset-bottom));
    }
  }

  &__head {
    margin-top: 0;
  }

  &__title {
    font-size: clamp(44px, 10vw, 120px);
    font-weight: 200;
    line-height: 1.04;
    letter-spacing: 0.06em;
  }

  // 3D 手机位于标题与页脚之间——留白即界面（规范 §12）
  &__fallback {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 150px;
    opacity: 0.6;
  }

  &__foot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $sp-3;
  }

  &__sub {
    font-size: 10px;
  }

  &__years {
    color: $c-text-3;
    font-size: 12px;
    letter-spacing: 0.3em;
    margin-top: -6px;
  }

  &__hint {
    font-size: 10px;
  }
}

.hero__inner {
  pointer-events: none;

  :deep(.museum-button),
  button {
    pointer-events: auto;
  }
}

// ---------- 年份叙事 ----------
.phases {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.phase {
  position: absolute;
  text-align: center;
  opacity: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $sp-3;

  &__year {
    color: rgba(245, 245, 245, 0.9);
  }

  &__text {
    color: $c-text-2;
  }
}

// ---------- 展厅索引 ----------
.galleries {
  position: relative;
  background: $c-bg;
  padding-block: $sp-9 $sp-7;
  border-top: 1px solid $c-line-soft;

  > .label {
    margin-bottom: $sp-7;
  }

  &__list {
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    grid-template-areas:
      'index name arrow'
      '. note .';
    align-items: baseline;
    column-gap: $sp-4;
    row-gap: $sp-1;
    padding-block: $sp-6;
    border-top: 1px solid $c-line-soft;
    transition: background 0.4s var(--ease-museum);

    &:last-of-type {
      border-bottom: 1px solid $c-line-soft;
    }

    &:hover,
    &:focus-visible {
      background: rgba(255, 255, 255, 0.03);

      .galleries__arrow {
        transform: translateX(6px);
        color: $c-text;
      }
    }
  }

  &__index {
    grid-area: index;
    color: $c-text-3;
    font-size: 12px;
  }

  &__name {
    grid-area: name;
  }

  &__note {
    grid-area: note;
  }

  &__arrow {
    grid-area: arrow;
    color: $c-text-3;
    font-size: 18px;
    transition: transform 0.4s var(--ease-museum), color 0.4s var(--ease-museum);
  }

  @include desktop {
    &__row {
      grid-template-columns: 80px 1fr 1fr auto;
      grid-template-areas: 'index name note arrow';
    }
  }
}

.home__foot {
  display: flex;
  flex-direction: column;
  gap: $sp-2;
  padding-top: $sp-7;
  margin-top: $sp-9;

  @include desktop {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
