<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDevice } from '@/composables/useDevice'

// Floating navigation (spec §47): hide while scrolling down, return
// when scrolling stops. Light on mobile, links on desktop.

const { isDesktop } = useDevice()
const route = useRoute()

const hidden = ref(false)
let lastY = 0
let stopTimer: ReturnType<typeof setTimeout> | null = null

function onScroll() {
  const y = window.scrollY
  if (y > lastY + 6 && y > 140) {
    hidden.value = true
  } else if (y < lastY - 6) {
    hidden.value = false
  }

  // Scrolling stopped → show again (spec §47)
  if (stopTimer) clearTimeout(stopTimer)
  stopTimer = setTimeout(() => {
    hidden.value = false
  }, 260)

  lastY = y
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (stopTimer) clearTimeout(stopTimer)
})

watch(
  () => route.path,
  () => {
    hidden.value = false
    lastY = window.scrollY
  },
)

const desktopLinks = [
  { to: '/timeline', label: '时间线' },
  { to: '/phones', label: '藏品' },
  { to: '/technology', label: '技术馆' },
  { to: '/form-factor', label: '形态馆' },
  { to: '/brands', label: '品牌馆' },
  { to: '/search', label: '搜索' },
  { to: '/collection', label: '我的收藏' },
]

const mobileDock = [
  { to: '/explore', label: '探索' },
  { to: '/timeline', label: '时间线' },
  { to: '/brands', label: '品牌馆' },
  { to: '/search', label: '搜索' },
  { to: '/collection', label: '我的' },
]
</script>

<template>
  <header class="nav" :class="{ 'nav--hidden': hidden }">
    <router-link to="/" class="nav__wordmark" aria-label="MOBILE MUSEUM — home">
      <span class="nav__mark mono">M·M</span>
      <span class="nav__title">MOBILE MUSEUM</span>
    </router-link>

    <nav v-if="isDesktop" class="nav__links" aria-label="Primary">
      <router-link
        v-for="link in desktopLinks"
        :key="link.to"
        :to="link.to"
        class="nav__link"
        :class="{ 'nav__link--active': route.path.startsWith(link.to) }"
      >
        {{ link.label }}
      </router-link>
    </nav>
  </header>

  <nav class="dock" :class="{ 'dock--hidden': hidden }" aria-label="Primary mobile">
    <router-link
      v-for="link in mobileDock"
      :key="link.to"
      :to="link.to"
      class="dock__item"
      :class="{ 'dock__item--active': route.path === link.to }"
    >
      {{ link.label }}
    </router-link>
  </nav>
</template>

<style lang="scss" scoped>
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $sp-4 $page-pad-x;
  @include safe-top;
  transition: transform 0.45s var(--ease-museum), opacity 0.45s var(--ease-museum);

  &--hidden {
    transform: translateY(-110%);
    opacity: 0;
  }

  &__wordmark {
    display: flex;
    align-items: baseline;
    gap: $sp-3;
  }

  &__mark {
    @include label-style(10px);
    color: $c-text;
    border: 1px solid $c-line;
    padding: 3px 6px;
  }

  &__title {
    @include label-style(12px);
    color: $c-text;
    letter-spacing: 0.3em;
  }

  &__links {
    display: flex;
    gap: $sp-5;
  }

  &__link {
    @include label-style(10px);
    letter-spacing: 0.18em;
    color: $c-text-3;
    @include hover-line;
    transition: color 0.3s var(--ease-museum);

    &:hover,
    &--active {
      color: $c-text;
    }
  }
}

.dock {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  gap: 2px;
  margin-bottom: calc(#{$sp-3} + env(safe-area-inset-bottom));
  padding: 6px;
  @include glass(999px);
  transition: transform 0.45s var(--ease-museum), opacity 0.45s var(--ease-museum);

  &--hidden {
    transform: translateX(-50%) translateY(140%);
    opacity: 0;
  }

  &__item {
    @include label-style(10px);
    color: $c-text-3;
    padding: $sp-2 $sp-3;
    border-radius: 999px;
    white-space: nowrap;
    transition: color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

    &--active {
      color: #0a0a0a;
      background: rgba(255, 255, 255, 0.9);
    }
  }

  @include desktop {
    display: none;
  }
}

.nav__links {
  display: none;

  @include desktop {
    display: flex;
  }
}
</style>
