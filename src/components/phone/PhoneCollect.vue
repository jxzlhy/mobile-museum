<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { hasExhibitContent } from '@/data/exhibits'
import MuseumButton from '@/components/common/MuseumButton.vue'
import AddToExhibition from '@/components/curator/AddToExhibition.vue'
import type { Phone } from '@/data/types'

// 收藏与策展入口（规范 §76–§77 / V0.8 §66）：轻量反馈，不弹 Toast。
const props = defineProps<{ phone: Phone }>()

const { hasPhone, togglePhone } = useCollection()
const collectedPulse = ref(false)

const inCollection = computed(() => hasPhone(props.phone.id))

function onCollect() {
  togglePhone(props.phone.id)
  collectedPulse.value = true
  setTimeout(() => (collectedPulse.value = false), 450)
}
</script>

<template>
  <div>
    <div class="collect">
      <button
        class="collect__btn"
        :class="{ 'collect__btn--on': inCollection, 'collect__btn--pulse': collectedPulse }"
        @click="onCollect"
      >
        <span class="collect__icon">{{ inCollection ? '✓' : '♡' }}</span>
        <span>{{ inCollection ? '已收藏' : '收藏' }}</span>
      </button>
      <router-link class="collect__museum label" :to="`/museum?focus=${phone.id}`" data-cursor="看展">
        在博物馆中查看 →
      </router-link>
      <router-link
        v-if="hasExhibitContent(phone.id)"
        class="collect__museum collect__museum--accent label"
        :to="`/museum/exhibit/${phone.id}`"
        data-cursor="深度观展"
      >
        LIVING EXHIBIT · 深度观展 →
      </router-link>
      <MuseumButton to="/collection" variant="line">查看我的手机史</MuseumButton>
    </div>
    <div class="collect__curate">
      <AddToExhibition
        block-type="exhibit"
        :block-data="() => ({ phoneId: phone.id, displayMode: 'photo' })"
        label="ADD TO EXHIBITION · 加入个人展览"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.collect {
  display: flex;
  flex-direction: column;
  gap: $sp-5;
  align-items: flex-start;
  padding: $sp-6;

  @include desktop {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.collect__btn {
  display: inline-flex;
  align-items: center;
  gap: $sp-3;
  padding: $sp-3 $sp-6;
  border: 1px solid $c-line;
  border-radius: 999px;
  color: $c-text;
  @include label-style(12px);
  letter-spacing: 0.2em;
  transition: border-color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

  &:hover {
    border-color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.04);
  }

  &--on {
    border-color: rgba(184, 178, 164, 0.55);
    color: $c-accent;
  }

  &--pulse {
    animation: collect-pulse 0.45s var(--ease-museum);
  }
}

.collect__icon {
  font-size: 14px;
}

.collect__curate {
  margin-top: $sp-5;
  padding-top: $sp-5;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  width: 100%;
}

.collect__museum {
  color: $c-text-2;
  border-bottom: 1px solid $c-line;
  padding-bottom: 2px;
  word-break: keep-all;

  &:hover {
    color: $c-text;
  }

  &--accent {
    color: $c-accent;
    border-bottom-color: rgba(184, 178, 164, 0.5);
  }
}

@keyframes collect-pulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.06); }
  100% { transform: scale(1); }
}
</style>
