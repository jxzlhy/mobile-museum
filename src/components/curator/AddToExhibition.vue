<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { curatorService } from '@/services/curator/curatorService'
import { makeBlock, renumber, type BlockType, type CuratedExhibition } from '@/services/curator/types'

// 加入个人展览（V0.8 规范 §39–§44 / §66 联动核心）：
// 任意页面把「引用」追加为 Block —— 不复制数据。
// 支持：选择已有展览 / 新建并加入。

const props = withDefaults(
  defineProps<{
    blockType: BlockType
    blockData: () => Record<string, unknown>
    label?: string
  }>(),
  { label: '加入个人展览' },
)

const router = useRouter()
const exhibitions = ref<CuratedExhibition[]>(curatorService.getAll())
const target = ref('')
const note = ref('')
const flash = ref(false)

const canAdd = computed(() => target.value !== '')

function add(create = false) {
  if (exhibitions.value.length >= 10 && !create) {
    note.value = '展览数量已达上限'
    return
  }
  let id = target.value
  if (create || id === '__new') {
    const ex = curatorService.create('未命名展览')
    if (!ex) {
      note.value = '最多 10 个展览'
      return
    }
    id = ex.id
  }
  const ex = curatorService.getById(id)
  if (!ex) return
  const updated = curatorService.update(id, {
    blocks: renumber([...ex.blocks, makeBlock(props.blockType, props.blockData(), ex.blocks.length)]),
  })
  if (!updated) {
    note.value = '加入失败：展览可能已满'
    return
  }
  exhibitions.value = curatorService.getAll()
  note.value = create ? `已新建「${updated.title}」并加入` : `已加入「${updated.title}」`
  flash.value = true
  setTimeout(() => (flash.value = false), 2600)
}

function openStudio() {
  router.push('/curator')
}
</script>

<template>
  <div class="ate">
    <p class="label ate__head">{{ label }}</p>
    <div class="ate__row">
      <select v-model="target" class="ate__select" aria-label="选择个人展览">
        <option value="" disabled>选择一个展览……</option>
        <option v-for="e in exhibitions" :key="e.id" :value="e.id">{{ e.title }}（{{ e.blocks.length }}）</option>
        <option value="__new">＋ 新建展览</option>
      </select>
      <button class="ate__btn" :disabled="!canAdd" @click="add(false)">加入</button>
      <button class="ate__btn ate__btn--ghost" @click="openStudio">去策展 →</button>
    </div>
    <p v-if="flash" class="label ate__note" role="status">{{ note }}</p>
  </div>
</template>

<style lang="scss" scoped>
.ate {
  &__head {
    font-size: 9px;
    color: $c-text-3;
    letter-spacing: 0.2em;
    margin-bottom: $sp-2;
  }

  &__row {
    display: flex;
    gap: $sp-2;
    flex-wrap: wrap;
  }

  &__select {
    flex: 1;
    min-width: 160px;
    padding: $sp-2 $sp-3;
    border-radius: 10px;
    border: 1px solid $c-line-soft;
    background: rgba(255, 255, 255, 0.04);
    color: $c-text;
    font-size: 13px;
  }

  &__btn {
    padding: $sp-2 $sp-4;
    border-radius: 10px;
    border: 1px solid rgba(184, 178, 164, 0.5);
    color: $c-accent;
    @include label-style(10px);

    &:disabled {
      opacity: 0.35;
    }

    &:hover:not(:disabled) {
      background: rgba(184, 178, 164, 0.1);
    }

    &--ghost {
      border-color: $c-line-soft;
      color: $c-text-3;
    }
  }

  &__note {
    margin-top: $sp-2;
    font-size: 10px;
    color: $c-accent;
  }
}
</style>
