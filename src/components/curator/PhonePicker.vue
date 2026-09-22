<script setup lang="ts">
import { ref, computed } from 'vue'
import { phoneService } from '@/services/phoneService'
import type { Phone } from '@/data/types'
import PhonePhoto from '@/components/common/PhonePhoto.vue'

// 展品选择器（Curator 通用）：搜索 + 列表，引用 phoneId，不复制数据。

const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const all = ref<Phone[]>([])
phoneService.getPhones().then((p) => (all.value = p))

const query = ref('')
const open = ref(false)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = q
    ? all.value.filter((p) => p.name.toLowerCase().includes(q) || p.brandName.includes(q) || String(p.releaseYear).includes(q))
    : all.value
  return list.slice(0, 40)
})

const selected = computed(() => all.value.find((p) => p.id === props.modelValue))

function pick(p: Phone) {
  emit('update:modelValue', p.id)
  open.value = false
  query.value = ''
}
</script>

<template>
  <div class="pp">
    <button class="pp__current" :class="{ 'pp__current--empty': !selected }" @click="open = !open">
      <template v-if="selected">
        <PhonePhoto :phone="selected" thumb class="pp__thumb" />
        <span class="pp__label">{{ selected.name }} · {{ selected.releaseYear }}</span>
      </template>
      <span v-else class="pp__label">{{ placeholder ?? '选择展品……' }}</span>
      <span class="pp__caret" aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>

    <div v-if="open" class="pp__drop glass-card">
      <input v-model="query" class="pp__search" placeholder="搜索展品……" aria-label="搜索展品" />
      <ul class="pp__list">
        <li v-for="p in filtered" :key="p.id">
          <button class="pp__row" :class="{ 'pp__row--on': p.id === modelValue }" @click="pick(p)">
            <span class="mono pp__year">{{ p.releaseYear }}</span>
            <span class="pp__name">{{ p.name }}</span>
            <span class="label pp__brand">{{ p.brandName }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.pp {
  position: relative;

  &__current {
    width: 100%;
    display: flex;
    align-items: center;
    gap: $sp-2;
    padding: $sp-3 $sp-4;
    border: 1px solid $c-line-soft;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
    color: $c-text;
    text-align: left;

    &--empty .pp__label {
      color: $c-text-3;
    }
  }

  &__thumb {
    width: 24px;
    height: 32px;
    flex-shrink: 0;
  }

  &__label {
    flex: 1;
    font-size: 13px;
    word-break: keep-all;
  }

  &__caret {
    color: $c-text-3;
    font-size: 10px;
  }

  &__drop {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    z-index: 30;
    padding: $sp-3;
    background: rgba(12, 12, 12, 0.94);
    max-height: 320px;
    overflow-y: auto;
  }

  &__search {
    width: 100%;
    padding: $sp-2 $sp-3;
    border: 1px solid $c-line-soft;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    color: $c-text;
    font-size: 13px;
    margin-bottom: $sp-2;
  }

  &__row {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: $sp-3;
    padding: $sp-2;
    border-radius: 8px;
    text-align: left;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    &--on {
      .pp__name {
        color: $c-accent;
      }
    }
  }

  &__year {
    font-size: 10px;
    color: $c-text-3;
    width: 36px;
    flex-shrink: 0;
  }

  &__name {
    font-size: 13px;
    word-break: keep-all;
  }

  &__brand {
    margin-left: auto;
    font-size: 8px;
    color: $c-text-3;
  }
}
</style>
