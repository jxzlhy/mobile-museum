<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import type { ExhibitionBlock, TimelineBlockData } from '@/services/curator/types'
import { eventService } from '@/services/eventService'
import { phoneService } from '@/services/phoneService'

// Timeline Block（V0.8 §13）：引用 Event / Phone 数据，
// 只保存显示控制（show / hide / order），不复制历史数据。
const props = defineProps<{ block: ExhibitionBlock }>()
const data = computed(() => props.block.data as TimelineBlockData)

interface Row {
  id: string
  year: number
  title: string
  description?: string
  href?: string
}

const rows = ref<Row[]>([])

watchEffect(() => {
  void data.value.mode
  void data.value.yearFrom
  void data.value.yearTo
  void data.value.hiddenIds
  void data.value.order
  ;(async () => {
    const hidden = new Set(data.value.hiddenIds ?? [])
    let list: Row[] = []
    if (data.value.mode === 'events') {
      const events = await eventService.getEvents()
      list = events.map((e) => ({ id: e.id, year: e.year, title: e.title, description: e.description }))
    } else {
      const phones = await phoneService.getPhones()
      list = phones.map((p) => ({ id: p.id, year: p.releaseYear, title: p.name, description: `${p.brandName} · ${p.releaseYear}`, href: `/phone/${p.id}` }))
    }
    if (data.value.yearFrom) list = list.filter((r) => r.year >= data.value.yearFrom!)
    if (data.value.yearTo) list = list.filter((r) => r.year <= data.value.yearTo!)
    list = list.filter((r) => !hidden.has(r.id))
    if (data.value.order?.length) {
      const idx = new Map(data.value.order.map((id, i) => [id, i]))
      list.sort((a, b) => (idx.get(a.id) ?? 999) - (idx.get(b.id) ?? 999))
    } else {
      list.sort((a, b) => a.year - b.year)
    }
    rows.value = list.slice(0, 12)
  })()
})
</script>

<template>
  <ol class="btl">
    <li v-for="r in rows" :key="r.id" class="btl__row">
      <span class="mono btl__year">{{ r.year }}</span>
      <component
        :is="r.href ? 'router-link' : 'span'"
        v-bind="r.href ? { to: r.href } : {}"
        class="btl__title"
      >
        {{ r.title }}
      </component>
    </li>
    <li v-if="rows.length === 0" class="mono btl__empty">NO ENTRIES</li>
  </ol>
</template>

<style lang="scss" scoped>
.btl {
  display: flex;
  flex-direction: column;

  &__row {
    display: flex;
    align-items: baseline;
    gap: $sp-4;
    padding-block: $sp-2;
    border-top: 1px solid rgba(255, 255, 255, 0.07);

    &:first-child {
      border-top: none;
    }
  }

  &__year {
    width: 48px;
    font-size: 11px;
    color: $c-accent;
    flex-shrink: 0;
  }

  &__title {
    font-size: 14px;
    font-weight: 350;
    word-break: keep-all;
  }

  a.btl__title:hover {
    color: $c-accent;
  }

  &__empty {
    font-size: 10px;
    color: $c-text-3;
    letter-spacing: 0.15em;
  }
}
</style>
