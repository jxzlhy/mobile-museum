<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import { curatorService } from '@/services/curator/curatorService'
import { blockRegistry, defaultBlockData, BLOCK_METAS } from '@/services/curator/blockRegistry'
import {
  MAX_BLOCKS,
  MAX_EXHIBIT_BLOCKS,
  MAX_NOTE_LENGTH,
  makeBlock,
  renumber,
  type CuratedExhibition,
  type ExhibitionBlock,
  type BlockType,
} from '@/services/curator/types'
import { getRenderer } from '@/components/curator/blocks'
import PhonePicker from '@/components/curator/PhonePicker.vue'

// Exhibition Editor（V0.8 规范 §17–§27 / §54–§59）：
// Desktop：Block List | Canvas | Inspector（策展工作台，不是 CMS）。
// Mobile：Vertical Story Editor + MOVE UP/DOWN 按钮（§17/§18）。
// Undo/Redo ≤50（§27）、Auto Save 800ms debounce + SAVING…/SAVED（§26/§59）。

useStageScene(() => new AmbientScene())

const route = useRoute()
const router = useRouter()

const ex = ref<CuratedExhibition | null>(null)
const selectedId = ref<string | null>(null)
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle')
const addOpen = ref(false)
const shareNote = ref('')
const isDesktop = ref(window.innerWidth >= 1080)

// ---- 载入（草稿优先）----
function load() {
  const id = String(route.params.id ?? '')
  const stored = curatorService.getById(id)
  if (!stored) {
    router.replace('/curator')
    return
  }
  const draft = curatorService.getDraft(id)
  ex.value = draft && draft.updatedAt > stored.updatedAt ? draft : stored
  selectedId.value = ex.value.blocks[0]?.id ?? null
}
onMounted(load)

// ---- Undo / Redo（§27）----
const history = ref<string[]>([])
const future = ref<string[]>([])
const HISTORY_MAX = 50
let restoring = false

function snapshot(): string {
  const e = ex.value
  if (!e) return ''
  return JSON.stringify({ title: e.title, subtitle: e.subtitle, intro: e.intro, coverPhoneId: e.coverPhoneId, blocks: e.blocks })
}

function pushHistory() {
  if (restoring) return
  history.value.push(snapshot())
  if (history.value.length > HISTORY_MAX) history.value.shift()
  future.value = []
}

function restore(snap: string) {
  if (!ex.value) return
  restoring = true
  const data = JSON.parse(snap)
  ex.value = { ...ex.value, ...data }
  void nextTick(() => (restoring = false))
}

function undo() {
  const prev = history.value.pop()
  if (prev === undefined) return
  future.value.push(snapshot())
  restore(prev)
}

function redo() {
  const next = future.value.pop()
  if (next === undefined) return
  history.value.push(snapshot())
  restore(next)
}

function onKeydown(e: KeyboardEvent) {
  const meta = e.metaKey || e.ctrlKey
  if (!meta) return
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// ---- Auto Save（§26）----
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => (ex.value ? snapshot() : ''),
  (val, old) => {
    if (!ex.value || val === old || restoring) return
    saveStatus.value = 'saving'
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      if (!ex.value) return
      curatorService.update(ex.value.id, {
        title: ex.value.title,
        subtitle: ex.value.subtitle,
        intro: ex.value.intro,
        coverPhoneId: ex.value.coverPhoneId,
        blocks: ex.value.blocks,
      })
      curatorService.saveDraft(ex.value)
      saveStatus.value = 'saved'
      setTimeout(() => (saveStatus.value = 'idle'), 1600)
    }, 800)
  },
)
onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
})

// ---- Block 操作（§17）----
const blocks = computed(() => ex.value?.blocks ?? [])
const selected = computed(() => blocks.value.find((b) => b.id === selectedId.value) ?? null)

function addBlock(type: BlockType) {
  if (!ex.value) return
  if (ex.value.blocks.length >= MAX_BLOCKS) return
  pushHistory()
  const block = makeBlock(type, defaultBlockData(type), ex.value.blocks.length)
  ex.value.blocks = renumber([...ex.value.blocks, block])
  selectedId.value = block.id
  addOpen.value = false
}

function duplicateBlock(id: string) {
  if (!ex.value) return
  const src = ex.value.blocks.find((b) => b.id === id)
  if (!src || ex.value.blocks.length >= MAX_BLOCKS) return
  pushHistory()
  const copy = makeBlock(src.type, JSON.parse(JSON.stringify(src.data)), 0)
  const idx = ex.value.blocks.findIndex((b) => b.id === id)
  const arr = [...ex.value.blocks]
  arr.splice(idx + 1, 0, copy)
  ex.value.blocks = renumber(arr)
  selectedId.value = copy.id
}

function deleteBlock(id: string) {
  if (!ex.value) return
  pushHistory()
  ex.value.blocks = renumber(ex.value.blocks.filter((b) => b.id !== id))
  if (selectedId.value === id) selectedId.value = ex.value.blocks[0]?.id ?? null
}

function moveBlock(id: string, dir: -1 | 1) {
  if (!ex.value) return
  const arr = [...ex.value.blocks]
  const i = arr.findIndex((b) => b.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= arr.length) return
  pushHistory()
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  ex.value.blocks = renumber(arr)
}

// ---- 拖拽排序（§17，桌面；移动端用按钮）----
let dragId: string | null = null
function onDragStart(id: string) {
  dragId = id
}
function onDrop(targetId: string) {
  if (!ex.value || !dragId || dragId === targetId) return
  pushHistory()
  const arr = [...ex.value.blocks]
  const from = arr.findIndex((b) => b.id === dragId)
  const to = arr.findIndex((b) => b.id === targetId)
  if (from < 0 || to < 0) return
  const [moved] = arr.splice(from, 1)
  arr.splice(to, 0, moved!)
  ex.value.blocks = renumber(arr)
  dragId = null
}

// ---- Inspector 数据修改 ----
function patchData(block: ExhibitionBlock, patch: Record<string, unknown>) {
  if (!ex.value) return
  const arr = ex.value.blocks.map((b) => (b.id === block.id ? { ...b, data: { ...(b.data as object), ...patch } } : b))
  ex.value.blocks = arr
}

function patchMeta(field: 'title' | 'subtitle' | 'intro' | 'coverPhoneId', value: string) {
  if (!ex.value) return
  pushHistory()
  ;(ex.value as Record<string, unknown>)[field] = value || undefined
}

// ---- 校验 ----
const blockErrors = ref<Record<string, string | null>>({})
async function runValidation() {
  if (!ex.value) return
  const errs: Record<string, string | null> = {}
  for (const b of ex.value.blocks) {
    errs[b.id] = await blockRegistry.validate(b)
  }
  blockErrors.value = errs
}
watch(() => ex.value?.blocks, runValidation, { deep: true })

// ---- Share / Preview ----
async function share() {
  if (!ex.value) return
  const result = await curatorService.buildShareUrl(ex.value)
  if (!result.ok) {
    shareNote.value = 'THIS EXHIBITION IS TOO LARGE TO SHARE'
  } else {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (nav.share) {
      try {
        await nav.share({ title: ex.value.title, url: result.url })
        shareNote.value = '已唤起分享'
        return
      } catch {
        /* 用户取消 → 复制 */
      }
    }
    try {
      await navigator.clipboard.writeText(result.url)
      shareNote.value = '链接已复制'
    } catch {
      shareNote.value = result.url
    }
  }
  setTimeout(() => (shareNote.value = ''), 4000)
}

function preview() {
  if (!ex.value) return
  curatorService.publishLocal(ex.value.id)
  router.push(`/curator/${ex.value.id}/preview`)
}

function exit() {
  if (ex.value) curatorService.saveDraft(ex.value)
  router.push('/curator')
}

function summary(b: ExhibitionBlock): string {
  const d = b.data as Record<string, unknown>
  switch (b.type) {
    case 'exhibit':
    case 'image':
      return String(d.phoneId || '未选择展品')
    case 'text':
    case 'quote':
      return String(d.text || '待填写').slice(0, 30)
    case 'timeline':
      return d.mode === 'events' ? '事件时间线' : '手机时间线'
    case 'comparison':
      return `${d.leftPhoneId || '?'} vs ${d.rightPhoneId || '?'}`
    case 'graph':
      return String(d.focusId || '未设置')
    case 'time-machine':
      return String(d.year)
    case 'transition':
      return String(d.label || '—')
    default:
      return ''
  }
}

const exhibitCount = computed(() => blocks.value.filter((b) => b.type === 'exhibit').length)
</script>

<template>
  <div v-if="ex" class="ed">
    <!-- 顶栏 -->
    <header class="ed__bar">
      <button class="ed__back label" @click="exit">← STUDIO</button>
      <input
        class="ed__title"
        :value="ex.title"
        aria-label="展览标题"
        maxlength="80"
        @focus="pushHistory()"
        @input="patchMeta('title', ($event.target as HTMLInputElement).value)"
      />
      <div class="ed__bar-actions">
        <p class="mono ed__save" :class="{ 'ed__save--on': saveStatus !== 'idle' }" aria-live="polite">
          {{ saveStatus === 'saving' ? 'SAVING…' : saveStatus === 'saved' ? 'SAVED' : '' }}
        </p>
        <button class="ed__mini" :disabled="!history.length" aria-label="撤销" @click="undo">↺</button>
        <button class="ed__mini" :disabled="!future.length" aria-label="重做" @click="redo">↻</button>
        <button class="ed__mini label" @click="share">SHARE</button>
        <button class="ed__preview label" @click="preview">PREVIEW →</button>
      </div>
    </header>
    <p v-if="shareNote" class="label ed__share-note" role="status">{{ shareNote }}</p>

    <div class="ed__body container">
      <!-- 左：Block List -->
      <aside class="ed__list" aria-label="Block 列表">
        <div class="ed__meta">
          <input
            class="ed__meta-input"
            :value="ex.subtitle ?? ''"
            placeholder="副标题（可选）"
            aria-label="副标题"
            maxlength="80"
            @focus="pushHistory()"
            @input="patchMeta('subtitle', ($event.target as HTMLInputElement).value)"
          />
          <textarea
            class="ed__meta-input ed__meta-intro"
            :value="ex.intro ?? ''"
            placeholder="导言（可选）：这场展览想说什么？"
            aria-label="导言"
            rows="3"
            maxlength="500"
            @focus="pushHistory()"
            @input="patchMeta('intro', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
          <label class="label ed__meta-label">COVER</label>
          <PhonePicker :model-value="ex.coverPhoneId ?? ''" placeholder="封面展品（可选）" @update:model-value="patchMeta('coverPhoneId', $event)" />
        </div>

        <ol class="ed__blocks">
          <li
            v-for="(b, i) in blocks"
            :key="b.id"
            class="ed__block"
            :class="{ 'ed__block--on': b.id === selectedId, 'ed__block--err': blockErrors[b.id] }"
            draggable="true"
            @dragstart="onDragStart(b.id)"
            @dragover.prevent
            @drop="onDrop(b.id)"
          >
            <button class="ed__block-main" @click="selectedId = b.id">
              <span class="mono ed__block-no">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="ed__block-type">{{ blockRegistry.get(b.type)?.icon }} {{ blockRegistry.get(b.type)?.label }}</span>
              <span class="label ed__block-sum">{{ summary(b) }}</span>
            </button>
            <div class="ed__block-acts">
              <button class="ed__act" :disabled="i === 0" aria-label="上移" @click="moveBlock(b.id, -1)">↑</button>
              <button class="ed__act" :disabled="i === blocks.length - 1" aria-label="下移" @click="moveBlock(b.id, 1)">↓</button>
              <button class="ed__act" aria-label="复制" @click="duplicateBlock(b.id)">⧉</button>
              <button class="ed__act ed__act--del" aria-label="删除" @click="deleteBlock(b.id)">✕</button>
            </div>
          </li>
        </ol>

        <!-- ADD BLOCK（§58：细线极简） -->
        <div class="ed__add">
          <button class="ed__add-btn label" @click="addOpen = !addOpen">＋ ADD BLOCK</button>
          <ul v-if="addOpen" class="ed__add-menu glass-card">
            <li v-for="m in BLOCK_METAS" :key="m.type">
              <button class="ed__add-item" @click="addBlock(m.type)">
                <span class="ed__add-icon" aria-hidden="true">{{ m.icon }}</span>
                <span class="label">{{ m.label }}</span>
                <span class="ed__add-zh">{{ m.labelZh }}</span>
              </button>
            </li>
          </ul>
        </div>
        <p class="label ed__count">{{ blocks.length }} / {{ MAX_BLOCKS }} BLOCKS · {{ exhibitCount }} / {{ MAX_EXHIBIT_BLOCKS }} EXHIBITS</p>
      </aside>

      <!-- 中：Canvas（桌面预览） -->
      <main v-if="isDesktop" class="ed__canvas" aria-label="展览预览画布">
        <section class="ed__canvas-cover">
          <p class="mono ed__canvas-theme">{{ ex.theme?.toUpperCase() ?? 'EXHIBITION' }}</p>
          <h2 class="ed__canvas-title">{{ ex.title }}</h2>
          <p v-if="ex.subtitle" class="body-lg ed__canvas-sub">{{ ex.subtitle }}</p>
          <p v-if="ex.intro" class="body-md ed__canvas-intro">{{ ex.intro }}</p>
        </section>
        <section v-for="(b, i) in blocks" :key="b.id" class="ed__canvas-block" :class="{ 'ed__canvas-block--sel': b.id === selectedId }" @click="selectedId = b.id">
          <p class="label ed__canvas-idx">{{ String(i + 1).padStart(2, '0') }}</p>
          <component :is="getRenderer(b.type)" v-if="getRenderer(b.type)" :block="b" />
          <p v-else class="mono ed__unavailable">CONTENT UNAVAILABLE</p>
        </section>
        <p v-if="blocks.length === 0" class="label ed__canvas-empty">从左侧添加第一个 Block，开始布置这场展览。</p>
      </main>

      <!-- 右：Inspector -->
      <aside class="ed__inspector" aria-label="属性面板">
        <template v-if="selected">
          <p class="label ed__insp-kind">{{ blockRegistry.get(selected.type)?.label }} · {{ blockRegistry.get(selected.type)?.labelZh }}</p>
          <p v-if="blockErrors[selected.id]" class="label ed__insp-err">{{ blockErrors[selected.id] }}</p>

          <template v-if="selected.type === 'exhibit'">
            <label class="label ed__insp-label">EXHIBIT</label>
            <PhonePicker :model-value="(selected.data as any).phoneId ?? ''" @update:model-value="patchData(selected, { phoneId: $event })" />
            <label class="label ed__insp-label">DISPLAY</label>
            <div class="ed__seg">
              <button v-for="m in (['photo', '3d', 'minimal'] as const)" :key="m" class="ed__seg-btn" :class="{ 'ed__seg-btn--on': ((selected.data as any).displayMode ?? 'photo') === m }" @click="patchData(selected, { displayMode: m })">
                {{ m === 'photo' ? 'PHOTO' : m === '3d' ? '3D' : 'MINIMAL' }}
              </button>
            </div>
            <label class="label ed__insp-label">TITLE OVERRIDE（可选）</label>
            <input class="ed__insp-input" :value="(selected.data as any).titleOverride ?? ''" maxlength="80" @input="patchData(selected, { titleOverride: ($event.target as HTMLInputElement).value })" />
            <label class="label ed__insp-label">CURATOR NOTE</label>
            <textarea class="ed__insp-input ed__insp-area" rows="4" :value="(selected.data as any).note ?? ''" :maxlength="MAX_NOTE_LENGTH" placeholder="写下你的个人注释……" @input="patchData(selected, { note: ($event.target as HTMLTextAreaElement).value })"></textarea>
          </template>

          <template v-else-if="selected.type === 'text' || selected.type === 'quote'">
            <label class="label ed__insp-label">{{ selected.type === 'text' ? 'CURATOR NOTE' : 'QUOTE（个人表达）' }}</label>
            <textarea class="ed__insp-input ed__insp-area" rows="5" :value="(selected.data as any).text ?? ''" maxlength="2000" @input="patchData(selected, { text: ($event.target as HTMLTextAreaElement).value })"></textarea>
          </template>

          <template v-else-if="selected.type === 'timeline'">
            <label class="label ed__insp-label">数据源</label>
            <div class="ed__seg">
              <button class="ed__seg-btn" :class="{ 'ed__seg-btn--on': (selected.data as any).mode === 'events' }" @click="patchData(selected, { mode: 'events' })">EVENTS</button>
              <button class="ed__seg-btn" :class="{ 'ed__seg-btn--on': (selected.data as any).mode === 'phones' }" @click="patchData(selected, { mode: 'phones' })">PHONES</button>
            </div>
            <label class="label ed__insp-label">年份范围</label>
            <div class="ed__row2">
              <input class="ed__insp-input" type="number" placeholder="起" :value="(selected.data as any).yearFrom ?? ''" @input="patchData(selected, { yearFrom: Number(($event.target as HTMLInputElement).value) || undefined })" />
              <input class="ed__insp-input" type="number" placeholder="止" :value="(selected.data as any).yearTo ?? ''" @input="patchData(selected, { yearTo: Number(($event.target as HTMLInputElement).value) || undefined })" />
            </div>
          </template>

          <template v-else-if="selected.type === 'comparison'">
            <label class="label ed__insp-label">LEFT</label>
            <PhonePicker :model-value="(selected.data as any).leftPhoneId ?? ''" @update:model-value="patchData(selected, { leftPhoneId: $event })" />
            <label class="label ed__insp-label">RIGHT</label>
            <PhonePicker :model-value="(selected.data as any).rightPhoneId ?? ''" @update:model-value="patchData(selected, { rightPhoneId: $event })" />
            <label class="label ed__insp-label">LABEL（可选）</label>
            <input class="ed__insp-input" :value="(selected.data as any).label ?? ''" maxlength="80" @input="patchData(selected, { label: ($event.target as HTMLInputElement).value })" />
          </template>

          <template v-else-if="selected.type === 'graph'">
            <label class="label ed__insp-label">GRAPH FOCUS</label>
            <input class="ed__insp-input" placeholder="phone:nokia-3310 / brand:nokia / era:1990s" :value="(selected.data as any).focusId ?? ''" @input="patchData(selected, { focusId: ($event.target as HTMLInputElement).value })" />
          </template>

          <template v-else-if="selected.type === 'time-machine'">
            <label class="label ed__insp-label">SCENE YEAR</label>
            <select class="ed__insp-input" :value="(selected.data as any).year ?? 2007" @change="patchData(selected, { year: Number(($event.target as HTMLSelectElement).value), sceneId: `scene-${($event.target as HTMLSelectElement).value}` })">
              <option v-for="y in [1973, 1983, 1999, 2007, 2010, 2019]" :key="y" :value="y">{{ y }}</option>
            </select>
          </template>

          <template v-else-if="selected.type === 'image'">
            <label class="label ed__insp-label">IMAGE SOURCE</label>
            <PhonePicker :model-value="(selected.data as any).phoneId ?? ''" @update:model-value="patchData(selected, { phoneId: $event })" />
            <label class="label ed__insp-label">ANGLE</label>
            <select class="ed__insp-input" :value="(selected.data as any).angle ?? 'hero'" @change="patchData(selected, { angle: ($event.target as HTMLSelectElement).value })">
              <option value="hero">主图</option>
              <option value="front">正面</option>
              <option value="back">背面</option>
              <option value="side">侧面</option>
              <option value="detail">细节</option>
            </select>
          </template>

          <template v-else-if="selected.type === 'transition'">
            <label class="label ed__insp-label">LABEL（可选）</label>
            <input class="ed__insp-input" :value="(selected.data as any).label ?? ''" maxlength="80" @input="patchData(selected, { label: ($event.target as HTMLInputElement).value })" />
          </template>

          <div class="ed__insp-acts">
            <button class="ed__act" @click="moveBlock(selected.id, -1)">MOVE ↑</button>
            <button class="ed__act" @click="moveBlock(selected.id, 1)">MOVE ↓</button>
            <button class="ed__act" @click="duplicateBlock(selected.id)">DUPLICATE</button>
            <button class="ed__act ed__act--del" @click="deleteBlock(selected.id)">DELETE</button>
          </div>
        </template>
        <p v-else class="label ed__insp-empty">选择一个 Block 进行编辑。</p>
      </aside>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ed {
  min-height: 100vh;
  min-height: 100dvh;
  padding-top: calc(64px + env(safe-area-inset-top));
  padding-bottom: $sp-10;

  &__bar {
    display: flex;
    align-items: center;
    gap: $sp-4;
    padding: $sp-3 $page-pad-x;
    position: sticky;
    top: calc(56px + env(safe-area-inset-top));
    z-index: 25;
    background: rgba(8, 8, 8, 0.82);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid $c-line-soft;
    flex-wrap: wrap;
  }

  &__back {
    color: $c-text-3;
    word-break: keep-all;

    &:hover {
      color: $c-text;
    }
  }

  &__title {
    flex: 1;
    min-width: 160px;
    background: transparent;
    border: none;
    border-bottom: 1px solid transparent;
    color: $c-text;
    font-size: 17px;
    font-weight: 350;
    padding-block: 4px;

    &:focus {
      outline: none;
      border-bottom-color: $c-line;
    }
  }

  &__bar-actions {
    display: flex;
    align-items: center;
    gap: $sp-2;
  }

  &__save {
    font-size: 9px;
    color: $c-accent;
    letter-spacing: 0.2em;
    min-width: 52px;
    text-align: right;
    opacity: 0;
    transition: opacity 0.3s var(--ease-museum);

    &--on {
      opacity: 1;
    }
  }

  &__mini {
    padding: 7px 12px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-2;
    font-size: 12px;

    &:hover:not(:disabled) {
      color: $c-text;
      border-color: $c-line;
    }

    &:disabled {
      opacity: 0.3;
    }
  }

  &__preview {
    padding: 7px 16px;
    border: 1px solid rgba(184, 178, 164, 0.55);
    border-radius: 999px;
    color: $c-accent;
    font-size: 10px;
    letter-spacing: 0.14em;

    &:hover {
      background: rgba(184, 178, 164, 0.1);
    }
  }

  &__share-note {
    padding-inline: $page-pad-x;
    margin-top: $sp-2;
    font-size: 10px;
    color: $c-accent;
    word-break: break-all;
  }

  &__body {
    margin-top: $sp-5;
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-5;

    @include desktop {
      grid-template-columns: 300px minmax(0, 1fr) 320px;
      align-items: start;
    }
  }

  // ---- 左列 ----
  &__meta {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
    margin-bottom: $sp-4;
  }

  &__meta-input {
    width: 100%;
    padding: $sp-2 $sp-3;
    border: 1px solid $c-line-soft;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.03);
    color: $c-text;
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
  }

  &__meta-intro {
    line-height: 1.6;
  }

  &__meta-label {
    margin-top: $sp-2;
    font-size: 8px;
    color: $c-text-3;
  }

  &__blocks {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
  }

  &__block {
    display: flex;
    align-items: stretch;
    border: 1px solid $c-line-soft;
    border-radius: 12px;
    transition: border-color 0.3s var(--ease-museum);
    cursor: grab;

    &--on {
      border-color: rgba(184, 178, 164, 0.6);
    }

    &--err {
      border-color: rgba(217, 154, 154, 0.5);
    }
  }

  &__block-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: $sp-2;
    padding: $sp-3;
    text-align: left;
  }

  &__block-no {
    font-size: 9px;
    color: $c-text-3;
  }

  &__block-type {
    font-size: 11px;
    letter-spacing: 0.1em;
    color: $c-text;
    white-space: nowrap;
  }

  &__block-sum {
    margin-left: auto;
    font-size: 8px;
    color: $c-text-3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 45%;
  }

  &__block-acts {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    padding-right: $sp-2;
  }

  &__act {
    width: 26px;
    height: 26px;
    border: 1px solid $c-line-soft;
    border-radius: 8px;
    color: $c-text-3;
    font-size: 11px;

    &:hover:not(:disabled) {
      color: $c-text;
    }

    &:disabled {
      opacity: 0.25;
    }

    &--del:hover {
      color: #d99a9a;
      border-color: rgba(217, 154, 154, 0.4);
    }
  }

  &__add {
    margin-top: $sp-4;
    position: relative;
  }

  &__add-btn {
    width: 100%;
    padding: $sp-3;
    border: 1px dashed $c-line;
    border-radius: 12px;
    color: $c-accent;
    font-size: 10px;
    letter-spacing: 0.2em;

    &:hover {
      background: rgba(184, 178, 164, 0.06);
    }
  }

  &__add-menu {
    margin-top: $sp-2;
    padding: $sp-2;
    max-height: 300px;
    overflow-y: auto;
    background: rgba(12, 12, 12, 0.95);
  }

  &__add-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-2 $sp-3;
    border-radius: 8px;
    text-align: left;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  &__add-icon {
    width: 22px;
    color: $c-accent;
    text-align: center;
  }

  &__add-zh {
    margin-left: auto;
    font-size: 11px;
    color: $c-text-3;
  }

  &__count {
    margin-top: $sp-3;
    font-size: 8px;
    color: $c-text-3;
    letter-spacing: 0.12em;
  }

  // ---- 中列 Canvas ----
  &__canvas {
    padding: $sp-6;
    border: 1px solid $c-line-soft;
    border-radius: 18px;
    background: rgba(10, 10, 10, 0.5);
    min-height: 60vh;
  }

  &__canvas-cover {
    padding-bottom: $sp-6;
    border-bottom: 1px solid $c-line-soft;
  }

  &__canvas-theme {
    font-size: 9px;
    color: $c-accent;
    letter-spacing: 0.3em;
  }

  &__canvas-title {
    margin-top: $sp-2;
    font-size: clamp(26px, 3.4vw, 40px);
    font-weight: 250;
    word-break: keep-all;
  }

  &__canvas-sub {
    margin-top: $sp-2;
    color: $c-text-2;
  }

  &__canvas-intro {
    margin-top: $sp-3;
    color: $c-text-3;
    max-width: 44ch;
  }

  &__canvas-block {
    padding: $sp-5 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: background 0.3s var(--ease-museum);

    &--sel {
      background: rgba(184, 178, 164, 0.05);
    }
  }

  &__canvas-idx {
    font-size: 8px;
    color: $c-text-3;
    margin-bottom: $sp-2;
  }

  &__canvas-empty {
    color: $c-text-3;
    font-size: 11px;
    padding-block: $sp-6;
    text-align: center;
  }

  &__unavailable {
    font-size: 10px;
    color: $c-text-3;
    letter-spacing: 0.15em;
  }

  // ---- 右列 Inspector ----
  &__inspector {
    padding: $sp-4;
    border: 1px solid $c-line-soft;
    border-radius: 16px;
    background: rgba(10, 10, 10, 0.5);
    position: sticky;
    top: calc(120px + env(safe-area-inset-top));
    max-height: calc(100vh - 160px);
    overflow-y: auto;
  }

  &__insp-kind {
    font-size: 9px;
    color: $c-accent;
    letter-spacing: 0.22em;
    margin-bottom: $sp-3;
  }

  &__insp-err {
    display: block;
    margin-bottom: $sp-3;
    font-size: 9px;
    color: #d99a9a;
  }

  &__insp-label {
    display: block;
    margin: $sp-3 0 $sp-1;
    font-size: 8px;
    color: $c-text-3;
    letter-spacing: 0.2em;
  }

  &__insp-input {
    width: 100%;
    padding: $sp-2 $sp-3;
    border: 1px solid $c-line-soft;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.03);
    color: $c-text;
    font-size: 13px;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: $c-line;
    }
  }

  &__insp-area {
    resize: vertical;
    line-height: 1.6;
  }

  &__seg {
    display: flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
  }

  &__seg-btn {
    flex: 1;
    padding: 7px 0;
    border-radius: 999px;
    font-size: 9px;
    letter-spacing: 0.1em;
    color: $c-text-3;

    &--on {
      color: #0a0a0a;
      background: rgba(255, 255, 255, 0.9);
    }
  }

  &__row2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $sp-2;
  }

  &__insp-acts {
    margin-top: $sp-5;
    padding-top: $sp-4;
    border-top: 1px solid $c-line-soft;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $sp-2;

    .ed__act {
      width: auto;
      height: auto;
      padding: $sp-2;
      font-size: 9px;
      letter-spacing: 0.12em;
    }
  }

  &__insp-empty {
    font-size: 11px;
    color: $c-text-3;
  }
}

// 移动端：Inspector 放在列表下方
@media (max-width: 1079px) {
  .ed__inspector {
    order: 3;
    position: static;
    max-height: none;
  }

  .ed__list {
    order: 1;
  }
}
</style>
