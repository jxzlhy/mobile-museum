<script setup lang="ts">
import MuseumButton from '@/components/common/MuseumButton.vue'
</script>

<template>
  <div class="page notfound container">
    <p class="label mono notfound__mark">404</p>
    <h1 class="heading-1" style="margin-block: 24px">EXHIBIT<br />NOT FOUND</h1>
    <p class="body-lg notfound__desc">The archive entry<br />could not be located.</p>
    <p class="body-md notfound__zh">这条档案条目无法定位——它可能从未入藏，或已被移出资料库。</p>
    <div class="notfound__actions">
      <MuseumButton to="/" variant="cta">BACK TO MUSEUM</MuseumButton>
      <MuseumButton to="/search" variant="line">搜索档案</MuseumButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.notfound {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;

  &__mark {
    font-size: 11px;
    letter-spacing: 0.4em;
    color: $c-accent;
    margin-bottom: $sp-2;
  }

  &__desc {
    color: $c-text-2;
  }

  &__zh {
    margin-top: $sp-2;
    color: $c-text-3;
    max-width: 36ch;
  }

  &__actions {
    margin-top: $sp-5;
    display: flex;
    gap: $sp-3;
    flex-wrap: wrap;
  }
}
</style>
