<script setup lang="ts">
import MuseumButton from '@/components/common/MuseumButton.vue'
</script>

<template>
  <div class="page notfound container">
    <p class="label">404 展厅</p>
    <h1 class="heading-1" style="margin-block: 24px">这个展厅<br />并不存在。</h1>
    <MuseumButton to="/" variant="cta">回到博物馆入口</MuseumButton>
  </div>
</template>

<style lang="scss" scoped>
.notfound {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
