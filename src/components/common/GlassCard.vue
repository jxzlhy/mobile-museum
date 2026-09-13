<script setup lang="ts">
// 共享磨砂玻璃卡（展品页与品牌馆共用同一套玻璃语言）。
// backdrop 高斯模糊 + 细描边 + 内发光 + 深投影；
// 移动端降模糊保性能，无 backdrop-filter 环境回退为高不透明底色。

withDefaults(defineProps<{ tone?: 'light' | 'dark' }>(), { tone: 'light' })
</script>

<template>
  <div class="glass-card" :class="`glass-card--${tone}`">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.glass-card {
  position: relative;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.09);

  &--light {
    background: rgba(255, 255, 255, 0.05);
    -webkit-backdrop-filter: blur(24px) saturate(1.15);
    backdrop-filter: blur(24px) saturate(1.15);
  }

  &--dark {
    background: rgba(10, 10, 10, 0.38);
    -webkit-backdrop-filter: blur(18px) saturate(1.1);
    backdrop-filter: blur(18px) saturate(1.1);
  }

  @media (max-width: 767px) {
    &--light {
      -webkit-backdrop-filter: blur(14px) saturate(1.1);
      backdrop-filter: blur(14px) saturate(1.1);
    }

    &--dark {
      -webkit-backdrop-filter: blur(10px) saturate(1.05);
      backdrop-filter: blur(10px) saturate(1.05);
    }
  }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    &--light {
      background: rgba(16, 16, 16, 0.94);
    }

    &--dark {
      background: rgba(12, 12, 12, 0.92);
    }
  }
}
</style>
