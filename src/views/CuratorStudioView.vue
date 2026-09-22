<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { curatorService } from '@/services/curator/curatorService'
import { exhibitionTemplates, instantiateTemplate, type ExhibitionTemplate } from '@/services/curator/templates'
import { MAX_EXHIBITIONS, type CuratedExhibition } from '@/services/curator/types'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import { phoneService } from '@/services/phoneService'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import type { Phone } from '@/data/types'

// CURATOR STUDIO 首页（V0.8 规范 §5–§6 / §21 / §30–§31 / §36–§37）：
// 像策展工作台，不是后台：新建 / 模板 / 我的展览 / 导入导出。
// 删除需确认（§31），Glass 确认层。

useStageScene(() => new AmbientScene())

const router = useRouter()
const exhibitions = ref<CuratedExhibition[]>(curatorService.getAll())
const covers = ref<Map<string, Phone>>(new Map())

refreshCovers()

async function refreshCovers() {
  const ids = exhibitions.value.map((e) => e.coverPhoneId).filter((v): v is string => Boolean(v))
  for (const id of ids) {
    if (!covers.value.get(id)) {
      const p = await phoneService.getPhoneById(id)
      if (p) covers.value.set(id, p)
    }
  }
  covers.value = new Map(covers.value)
}

// ---- 新建 ----
const creating = ref(false)
const newTitle = ref('')

function createBlank() {
  const ex = curatorService.create(newTitle.value || '未命名展览')
  if (ex) router.push(`/curator/${ex.id}`)
}

function useTemplate(t: ExhibitionTemplate) {
  const ex = curatorService.create(t.titleZh, t.theme)
  if (!ex) return
  curatorService.update(ex.id, {
    subtitle: t.subtitle,
    intro: t.intro,
    coverPhoneId: t.coverPhoneId,
    blocks: instantiateTemplate(t),
  })
  router.push(`/curator/${ex.id}`)
}

// ---- 操作 ----
function duplicate(id: string) {
  const copy = curatorService.duplicate(id)
  if (copy) exhibitions.value = curatorService.getAll()
}

const confirmDelete = ref<string | null>(null)
function doDelete() {
  if (confirmDelete.value) curatorService.remove(confirmDelete.value)
  confirmDelete.value = null
  exhibitions.value = curatorService.getAll()
}

// ---- 导入 / 导出（§36–§37）----
const fileEl = ref<HTMLInputElement>()
const importNote = ref('')

function exportAll() {
  const data = {
    format: 'mobile-museum-exhibition-collection',
    version: 1,
    exportedAt: new Date().toISOString(),
    exhibitions: exhibitions.value.map((e) => JSON.parse(curatorService.exportExhibition(e))),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mobile-museum-exhibitions.json'
  a.click()
  URL.revokeObjectURL(url)
}

async function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importNote.value = ''
  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    const list = Array.isArray(parsed)
      ? parsed
      : parsed.format === 'mobile-museum-exhibition-collection' && Array.isArray(parsed.exhibitions)
        ? parsed.exhibitions
        : [parsed]
    let okCount = 0
    const warnings: string[] = []
    for (const item of list.slice(0, MAX_EXHIBITIONS)) {
      const json = JSON.stringify({ format: 'mobile-museum-exhibition', version: 1, ...item })
      const result = await curatorService.importExhibition(json)
      if (result.ok) {
        okCount += 1
        warnings.push(...result.warnings)
      } else {
        warnings.push(result.error)
      }
    }
    exhibitions.value = curatorService.getAll()
    refreshCovers()
    importNote.value = warnings.length
      ? `已导入 ${okCount} 个展览 · ${warnings.join('；')}`
      : `已导入 ${okCount} 个展览`
  } catch {
    importNote.value = 'INVALID EXHIBITION FILE'
  }
  ;(e.target as HTMLInputElement).value = ''
}

function exhibitCount(e: CuratedExhibition) {
  return e.blocks.filter((b) => b.type === 'exhibit' || b.type === 'image').length
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

const canCreate = computed(() => exhibitions.value.length < MAX_EXHIBITIONS)
</script>

<template>
  <div class="studio container">
    <header class="studio__head">
      <p class="label">CURATOR STUDIO · 策展工作台</p>
      <h1 class="heading-1" style="margin-top: 16px">组织你的历史</h1>
      <p class="body-lg studio__intro">把发现过的手机、故事、关系与场景，重新排成一场属于你观看方式的展览。</p>
    </header>

    <!-- 新建 -->
    <section class="studio__new">
      <div class="studio__new-row">
        <button v-if="!creating && canCreate" class="studio__create" @click="creating = true">＋ NEW EXHIBITION</button>
        <p v-else-if="!canCreate" class="label studio__limit">已达上限 · {{ MAX_EXHIBITIONS }} 个展览</p>
        <div v-if="creating" class="studio__create-form glass-card">
          <input v-model="newTitle" class="studio__input" placeholder="展览标题" maxlength="80" @keyup.enter="createBlank" />
          <MuseumButton variant="cta" @click="createBlank">创建</MuseumButton>
          <MuseumButton variant="line" @click="creating = false">取消</MuseumButton>
        </div>
      </div>
      <div class="studio__io">
        <button class="studio__io-btn label" @click="exportAll">EXPORT JSON</button>
        <button class="studio__io-btn label" @click="fileEl?.click()">IMPORT JSON</button>
        <input ref="fileEl" type="file" accept="application/json,.json" class="studio__file" @change="onImportFile" />
      </div>
    </section>
    <p v-if="importNote" class="label studio__note" role="status">{{ importNote }}</p>

    <!-- 模板 -->
    <section class="studio__tpl">
      <p class="label studio__sec-head">START FROM A TEMPLATE · 模板</p>
      <div class="studio__tpl-grid">
        <button v-for="t in exhibitionTemplates" :key="t.id" class="studio__tpl-card" @click="useTemplate(t)">
          <span class="label mono studio__tpl-theme">{{ t.theme?.toUpperCase() }}</span>
          <span class="studio__tpl-title">{{ t.titleZh }}</span>
          <span class="label studio__tpl-en">{{ t.title }}</span>
          <span class="mono studio__tpl-count">{{ t.blocks.length }} BLOCKS →</span>
        </button>
      </div>
    </section>

    <!-- 我的展览 -->
    <section class="studio__list">
      <p class="label studio__sec-head">MY EXHIBITIONS</p>
      <p v-if="exhibitions.length === 0" class="mono studio__empty">YOUR EXHIBITION IS EMPTY</p>
      <article v-for="e in exhibitions" :key="e.id" class="studio__item glass-card">
        <button class="studio__item-main" @click="router.push(`/curator/${e.id}`)">
          <span class="studio__cover">
            <PhonePhoto v-if="e.coverPhoneId && covers.get(e.coverPhoneId)" :phone="covers.get(e.coverPhoneId)!" thumb />
            <span v-else class="studio__cover-abs" aria-hidden="true">◫</span>
          </span>
          <span class="studio__item-body">
            <span class="studio__item-title">{{ e.title }}</span>
            <span class="label studio__item-meta">
              {{ exhibitCount(e) }} exhibits · {{ e.blocks.length }} blocks · {{ fmtDate(e.updatedAt) }}
              <template v-if="!e.published"> · 草稿</template>
            </span>
          </span>
          <span class="mono studio__item-arrow" aria-hidden="true">→</span>
        </button>
        <div class="studio__item-actions">
          <button class="studio__act label" @click="duplicate(e.id)">复制</button>
          <button class="studio__act label" @click="curatorService.update(e.id, { published: !e.published }); exhibitions = curatorService.getAll()">
            {{ e.published ? '转草稿' : '发布' }}
          </button>
          <button class="studio__act studio__act--danger label" @click="confirmDelete = e.id">删除</button>
        </div>
      </article>
    </section>

    <!-- 删除确认（§31：Glass / Blur / Minimal） -->
    <div v-if="confirmDelete" class="studio__confirm" role="alertdialog" aria-label="确认删除展览">
      <div class="studio__confirm-backdrop" @click="confirmDelete = null"></div>
      <div class="studio__confirm-card glass-card">
        <p class="label">DELETE EXHIBITION</p>
        <p class="body-md">删除后无法恢复。确认删除这个展览？</p>
        <div class="studio__confirm-actions">
          <MuseumButton variant="line" @click="confirmDelete = null">取消</MuseumButton>
          <MuseumButton variant="cta" @click="doDelete">确认删除</MuseumButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.studio {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head .label {
    margin-bottom: $sp-2;
  }

  &__intro {
    margin-top: $sp-3;
    color: $c-text-2;
    max-width: 42ch;
  }

  &__new {
    margin-top: $sp-7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $sp-4;
    flex-wrap: wrap;
  }

  &__new-row {
    display: flex;
    align-items: center;
    gap: $sp-3;
    flex-wrap: wrap;
  }

  &__create {
    padding: $sp-4 $sp-7;
    border: 1px solid rgba(184, 178, 164, 0.5);
    border-radius: 999px;
    color: $c-accent;
    @include label-style(12px);
    letter-spacing: 0.18em;

    &:hover {
      background: rgba(184, 178, 164, 0.1);
    }
  }

  &__limit {
    font-size: 9px;
    color: $c-text-3;
  }

  &__create-form {
    display: flex;
    align-items: center;
    gap: $sp-2;
    padding: $sp-3;
  }

  &__input {
    padding: $sp-3 $sp-4;
    border: 1px solid $c-line-soft;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    color: $c-text;
    font-size: 14px;
    min-width: 200px;
  }

  &__io {
    display: flex;
    gap: $sp-2;
  }

  &__io-btn {
    font-size: 9px;
    padding: 8px 14px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-3;

    &:hover {
      color: $c-text;
    }
  }

  &__file {
    display: none;
  }

  &__note {
    margin-top: $sp-2;
    font-size: 10px;
    color: $c-accent;
  }

  &__sec-head {
    font-size: 10px;
    color: $c-text-3;
    margin-bottom: $sp-3;
  }

  &__tpl {
    margin-top: $sp-8;
  }

  &__tpl-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-3;

    @include desktop {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__tpl-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-1;
    padding: $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 16px;
    text-align: left;
    transition: border-color 0.35s var(--ease-museum), background 0.35s var(--ease-museum);

    &:hover {
      border-color: $c-line;
      background: rgba(255, 255, 255, 0.03);
    }
  }

  &__tpl-theme {
    font-size: 8px;
    color: $c-accent;
    letter-spacing: 0.24em;
  }

  &__tpl-title {
    font-size: 17px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__tpl-en {
    font-size: 8px;
    color: $c-text-3;
    letter-spacing: 0.18em;
  }

  &__tpl-count {
    margin-top: $sp-2;
    font-size: 10px;
    color: $c-text-2;
  }

  &__list {
    margin-top: $sp-8;
  }

  &__empty {
    font-size: 11px;
    letter-spacing: 0.2em;
    color: $c-text-3;
    padding: $sp-5;
    border: 1px dashed $c-line-soft;
    border-radius: 14px;
    text-align: center;
  }

  &__item {
    padding: $sp-4 $sp-5;
    margin-bottom: $sp-3;
  }

  &__item-main {
    width: 100%;
    display: flex;
    align-items: center;
    gap: $sp-4;
    text-align: left;
  }

  &__cover {
    width: 44px;
    height: 58px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid $c-line-soft;
    border-radius: 10px;
  }

  &__cover-abs {
    color: $c-text-3;
    font-size: 18px;
  }

  &__item-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__item-title {
    font-size: 17px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__item-meta {
    font-size: 9px;
    color: $c-text-3;
    word-break: keep-all;
  }

  &__item-arrow {
    color: $c-text-3;
  }

  &__item-actions {
    margin-top: $sp-3;
    padding-top: $sp-3;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    gap: $sp-2;
  }

  &__act {
    font-size: 9px;
    padding: 6px 12px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-3;

    &:hover {
      color: $c-text;
    }

    &--danger:hover {
      color: #d99a9a;
      border-color: rgba(217, 154, 154, 0.4);
    }
  }

  &__confirm {
    position: fixed;
    inset: 0;
    z-index: 90;

    &-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(4, 4, 4, 0.66);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
    }

    &-card {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(380px, 88vw);
      padding: $sp-6;
      display: flex;
      flex-direction: column;
      gap: $sp-3;
      align-items: flex-start;
      background: rgba(12, 12, 12, 0.92);
    }

    &-actions {
      display: flex;
      gap: $sp-2;
      margin-top: $sp-2;
    }
  }
}
</style>
