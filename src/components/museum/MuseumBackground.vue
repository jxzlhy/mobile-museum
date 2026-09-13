<script setup lang="ts">
// Museum atmosphere (spec §79–§80): not pure black — a faint light pool,
// a vignette, and a whisper of grain. Fixed, decorative, zero interaction.
</script>

<template>
  <div class="museum-bg" aria-hidden="true">
    <div class="museum-bg__pool museum-bg__pool--a"></div>
    <div class="museum-bg__pool museum-bg__pool--b"></div>
    <div class="museum-bg__vignette"></div>
    <div class="museum-bg__grain"></div>
  </div>
</template>

<style lang="scss" scoped>
.museum-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;

  &__pool {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);

    &--a {
      width: 70vmax;
      height: 70vmax;
      top: -30vmax;
      left: -20vmax;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 60%);
    }

    &--b {
      width: 60vmax;
      height: 60vmax;
      bottom: -25vmax;
      right: -15vmax;
      background: radial-gradient(circle, rgba(150, 170, 220, 0.045) 0%, transparent 60%);
    }
  }

  &__vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.5) 100%);
  }

  // Film grain — extremely subtle (spec §80)
  &__grain {
    position: absolute;
    inset: -50%;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.045;
    animation: grain-shift 1.2s steps(4) infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
}

@keyframes grain-shift {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-1%, 1%); }
  50% { transform: translate(1%, -1%); }
  75% { transform: translate(-1%, -1%); }
  100% { transform: translate(0, 0); }
}
</style>
