<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import { myMuseumService, type MyEra, type PassportRow } from '@/services/myMuseumService'
import { discoveryService } from '@/services/discoveryService'
import { museumService } from '@/services/museumService'
import { memoryService } from '@/services/memoryService'
import type { Phone } from '@/data/types'
import PhonePhoto from '@/components/common/PhonePhoto.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import MyJourneys from '@/components/museum/MyJourneys.vue'
import HistoricalVisits from '@/components/museum/HistoricalVisits.vue'
import { curatorService } from '@/services/curator/curatorService'
import { makeBlock, renumber } from '@/services/curator/types'
import { useRouter } from 'vue-router'

// MY MUSEUM（V0.4 规范 §34–§42 / §73 / §75）：
// 我的博物馆 = MY PHONES + MY ERA + MY COLLECTION + PASSPORT。
// 数据全部本地（localStorage），不上传（§37）。
// 护照是探索记录，不是游戏积分（§39 / §60）。

useStageScene(() => new AmbientScene())

const { collectionPhones, stats, sortMode, movePhone, removePhone, clearCollection } = useCollection()

const sortLabel = computed(() => (sortMode.value === 'era' ? '按年代' : '按加入顺序'))

function toggleSort() {
  sortMode.value = sortMode.value === 'era' ? 'added' : 'era'
}

// ---- MY MUSEUM：概览 / 时代 / 护照 ----
const era = ref<MyEra | null>(null)
const passport = ref<{ discovered: number; total: number; rows: PassportRow[] } | null>(null)
const eraRooms = ref(0)
const recent = ref<Phone[]>([])

onMounted(async () => {
  era.value = await myMuseumService.getEra()
  passport.value = await myMuseumService.getPassport()
  eraRooms.value = (await museumService.getEraRooms()).length
  // RECENTLY VISITED（V0.5 §25）：最近看过的，最多 12 条展示
  recent.value = await memoryService.getRecent(12)
})

// 发现变化时刷新护照（在展厅看过新展品再回来）
void discoveryService.onChange(() => {
  void myMuseumService.getPassport().then((p) => (passport.value = p))
})

const passportPercent = computed(() => {
  if (!passport.value || passport.value.total === 0) return 0
  return Math.round((passport.value.discovered / passport.value.total) * 100)
})

// ---- V0.8 CURATOR STUDIO（§39 / §62）----
const router = useRouter()
const myExhibitions = ref(curatorService.getAll())

function createFromCollection() {
  if (collectionPhones.value.length === 0) return
  const ex = curatorService.create('我的馆藏')
  if (!ex) return
  const blocks = renumber([
    makeBlock('text', { text: '这是我收藏的手机——每一台都是我想再看一遍的。' }, 0),
    ...collectionPhones.value.map((p, i) => makeBlock('exhibit', { phoneId: p.id, displayMode: 'photo' }, i + 1)),
  ])
  curatorService.update(ex.id, { blocks, coverPhoneId: collectionPhones.value[0]?.id })
  router.push(`/curator/${ex.id}`)
}
</script>

<template>
  <div class="page collection container">
    <header class="collection__head">
      <p class="label">MY MUSEUM · 个人展区</p>
      <h1 class="heading-1" style="margin-top: 16px">我的<br />博物馆</h1>

      <p class="collection__hero-mono mono">
        {{ stats ? `${stats.deviceCount} EXHIBITS` : '0 EXHIBITS' }}
        <template v-if="stats?.span"> · {{ stats.span.from }} — {{ stats.span.to }}</template>
      </p>
      <p class="collection__hero-note body-md">YOUR MOBILE HISTORY · 你的移动岁月，由你策展。</p>

      <!-- MY ERA（规范 §36：简单规则，非 AI） -->
      <p v-if="era" class="collection__era">
        <span class="label">MY ERA</span>
        <span class="collection__era-zh">{{ era.zh }}</span>
        <span class="mono collection__era-en">{{ era.en }}</span>
        <span class="collection__era-note body-md">{{ era.note }}</span>
      </p>
    </header>

    <!-- 空状态（规范 §75） -->
    <div v-if="collectionPhones.length === 0" class="collection__empty">
      <p class="body-lg">你的博物馆正等待第一件展品。</p>
      <p class="body-md">去藏品总目走一走，把塑造过移动历史的手机加入馆藏——博物馆会按年份为你陈列。</p>
      <div class="collection__empty-actions">
        <MuseumButton to="/phones" variant="cta">浏览全部藏品</MuseumButton>
        <MuseumButton to="/museum" variant="line">走进主展厅</MuseumButton>
      </div>
    </div>

    <template v-else>
      <!-- 排序 + 统计 -->
      <div class="collection__toolbar">
        <button class="collection__sort" @click="toggleSort">
          <span class="label">排序 · {{ sortLabel }}</span>
          <span class="collection__sort-icon mono">⇅</span>
        </button>
        <p v-if="stats" class="collection__stats label">
          {{ stats.deviceCount }} 台设备 · {{ stats.brandCount }} 个品牌
          <template v-if="stats.oldest !== stats.newest"> · 最早 {{ stats.oldest.releaseYear }}（{{ stats.oldest.name }}） · 最新 {{ stats.newest.releaseYear }}</template>
        </p>
      </div>

      <ol class="collection__timeline">
        <li v-for="(p, i) in collectionPhones" :key="p.id" class="collection__row">
          <p class="collection__year year-mid">{{ p.releaseYear }}</p>
          <span class="collection__art"><PhonePhoto :phone="p" thumb /></span>
          <div class="collection__info">
            <router-link :to="`/phone/${p.id}`" class="collection__name" data-cursor="看展">
              {{ p.name }}
            </router-link>
            <p class="label collection__brand">{{ p.brandName }}</p>
            <p class="collection__index mono">{{ sortMode === 'added' ? `第 ${i + 1} 件加入` : `设备编号 ${String(i + 1).padStart(2, '0')}` }}</p>
          </div>
          <div class="collection__actions">
            <button
              class="collection__btn"
              :disabled="i === 0"
              aria-label="上移"
              @click="movePhone(p.id, -1)"
            >
              ↑
            </button>
            <button
              class="collection__btn"
              :disabled="i === collectionPhones.length - 1"
              aria-label="下移"
              @click="movePhone(p.id, 1)"
            >
              ↓
            </button>
            <button class="collection__btn collection__btn--remove" aria-label="移出收藏" @click="removePhone(p.id)">
              ✕
            </button>
          </div>
        </li>
      </ol>

      <footer class="collection__foot hairline-top">
        <MuseumButton variant="line" @click="clearCollection">清空展区</MuseumButton>
      </footer>
    </template>

    <!-- ====== RECENTLY VISITED（V0.5 §25）====== -->
    <section class="recent" aria-label="最近访问">
      <p class="label recent__head">RECENTLY VISITED · 最近访问</p>
      <p v-if="recent.length === 0" class="mono recent__empty">NO RECENT EXHIBITS</p>
      <nav v-else class="recent__strip">
        <router-link
          v-for="p in recent"
          :key="p.id"
          :to="`/museum/exhibit/${p.id}`"
          class="recent__item"
          data-cursor="看展"
        >
          <span class="recent__art"><PhonePhoto :phone="p" thumb /></span>
          <span class="recent__name">{{ p.name }}</span>
          <span class="label recent__year">{{ p.releaseYear }}</span>
        </router-link>
      </nav>
    </section>

    <!-- ====== CURATOR STUDIO（V0.8 §39 / §62）====== -->
    <section class="curator-entry glass-card" aria-label="策展工作台">
      <header class="curator-entry__head">
        <div>
          <p class="label">CURATOR STUDIO · 策展工作台</p>
          <p class="body-md curator-entry__desc">把收藏、发现、路线与场景，组织成一场属于你的展览。</p>
        </div>
        <MuseumButton to="/curator" variant="cta">OPEN STUDIO</MuseumButton>
      </header>
      <ul v-if="myExhibitions.length" class="curator-entry__list">
        <li v-for="e in myExhibitions.slice(0, 4)" :key="e.id">
          <router-link :to="`/curator/${e.id}`" class="curator-entry__row">
            <span class="curator-entry__title">{{ e.title }}</span>
            <span class="label mono curator-entry__meta">{{ e.blocks.length }} BLOCKS · {{ e.published ? 'PUBLISHED' : 'DRAFT' }}</span>
          </router-link>
        </li>
      </ul>
      <button v-if="collectionPhones.length > 0" class="curator-entry__from label" @click="createFromCollection">
        ＋ 用收藏创建展览（{{ collectionPhones.length }} 台）
      </button>
    </section>

    <!-- ====== HISTORICAL VISITS（V0.7 §51–§53 / §96）====== -->
    <HistoricalVisits />

    <!-- ====== MY JOURNEYS（V0.6 §53–§54）====== -->
    <MyJourneys />

    <!-- ====== MUSEUM PASSPORT（规范 §38–§42）====== -->
    <section class="passport glass-card" aria-label="博物馆护照">
      <header class="passport__head">
        <div>
          <p class="label">MUSEUM PASSPORT · 博物馆护照</p>
          <p v-if="passport" class="passport__count mono">
            {{ passport.discovered }} / {{ passport.total }} EXHIBITS
          </p>
        </div>
        <MuseumButton to="/museum" variant="line">继续探索</MuseumButton>
      </header>

      <p v-if="!passport || passport.discovered === 0" class="body-md passport__empty">
        还没有发现记录。进入博物馆，走近任意一件展品，护照会开始盖印。
      </p>

      <ul v-else-if="passport" class="passport__rows">
        <li v-for="row in passport.rows" :key="row.id" class="passport__row">
          <span class="passport__zh">{{ row.zh }}</span>
          <span class="mono passport__en">{{ row.en }}</span>
          <span class="passport__bar" aria-hidden="true">
            <span
              class="passport__fill"
              :style="{ transform: `scaleX(${row.total ? row.discovered / row.total : 0})` }"
            ></span>
          </span>
          <span class="mono passport__num">{{ row.discovered }} / {{ row.total }}</span>
        </li>
      </ul>

      <p v-if="passport && passport.discovered > 0" class="passport__note label">
        {{ passportPercent }}% · 这是探索记录，不是积分（规范 §39 / §42）。
      </p>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.collection {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head {
    .label {
      margin-bottom: $sp-2;
    }
  }

  &__hero-mono {
    margin-top: $sp-5;
    color: $c-accent;
    font-size: 12px;
    letter-spacing: 0.25em;
  }

  &__hero-note {
    margin-top: $sp-1;
    color: $c-text-3;
  }

  &__era {
    margin-top: $sp-5;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: $sp-4 $sp-5;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
    max-width: 460px;

    .label {
      font-size: 9px;
      color: $c-text-3;
    }
  }

  &__era-zh {
    font-size: 20px;
    font-weight: 350;
  }

  &__era-en {
    font-size: 10px;
    color: $c-accent;
    letter-spacing: 0.22em;
  }

  &__era-note {
    color: $c-text-2;
    word-break: keep-all;
  }

  &__empty {
    margin-top: $sp-8;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-3;
    max-width: 40ch;

    .body-md {
      color: $c-text-3;
    }

    &-actions {
      margin-top: $sp-4;
      display: flex;
      gap: $sp-3;
      flex-wrap: wrap;
    }
  }

  &__toolbar {
    margin-top: $sp-7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $sp-4;
    flex-wrap: wrap;
  }

  &__sort {
    display: inline-flex;
    align-items: center;
    gap: $sp-2;
    padding: 8px 16px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    transition: border-color 0.3s var(--ease-museum);

    .label {
      color: $c-text-2;
      word-break: keep-all;
    }

    &-icon {
      color: $c-accent;
      font-size: 12px;
    }

    &:hover {
      border-color: $c-line;
    }
  }

  &__stats {
    font-size: 9px;
    text-align: right;
    word-break: keep-all;
  }

  &__timeline {
    margin-top: $sp-5;
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: auto 40px 1fr auto;
    align-items: center;
    gap: $sp-4;
    padding-block: $sp-4;
    border-top: 1px solid $c-line-soft;

    &:last-child {
      border-bottom: 1px solid $c-line-soft;
    }

    @include desktop {
      grid-template-columns: auto 72px 1fr auto;
      gap: $sp-5;
    }
  }

  &__year {
    font-size: clamp(24px, 6vw, 56px);
    color: $c-text;
  }

  &__art {
    width: 36px;
    height: 56px;
    display: flex;
    align-items: center;

    @include desktop {
      width: 52px;
      height: 72px;
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 16px;
    font-weight: 350;
    word-break: keep-all;
    line-height: 1.3;
  }

  &__brand {
    font-size: 9px;
    word-break: keep-all;
  }

  &__index {
    font-size: 10px;
    color: $c-text-3;
    margin-top: $sp-1;
    word-break: keep-all;
  }

  &__actions {
    display: flex;
    gap: $sp-1;

    @include desktop {
      gap: $sp-2;
    }
  }

  &__btn {
    width: 30px;
    height: 30px;
    border: 1px solid $c-line-soft;
    border-radius: 50%;
    color: $c-text-2;
    font-size: 12px;
    transition: border-color 0.3s var(--ease-museum), color 0.3s var(--ease-museum), opacity 0.3s;

    @include desktop {
      width: 36px;
      height: 36px;
      font-size: 13px;
    }

    &:hover:not(:disabled) {
      color: $c-text;
      border-color: $c-line;
    }

    &:disabled {
      opacity: 0.25;
      cursor: default;
    }

    &--remove:hover {
      color: #d99a9a;
      border-color: rgba(217, 154, 154, 0.4);
    }
  }

  &__foot {
    margin-top: $sp-8;
    padding-top: $sp-6;
  }
}

// ---- RECENTLY VISITED（V0.5 §25）----
.recent {
  margin-top: $sp-8;

  &__head {
    font-size: 10px;
    margin-bottom: $sp-3;
  }

  &__empty {
    font-size: 11px;
    letter-spacing: 0.2em;
    color: $c-text-3;
    padding: $sp-4;
    border: 1px dashed $c-line-soft;
    border-radius: 14px;
    text-align: center;
  }

  &__strip {
    display: flex;
    gap: $sp-3;
    overflow-x: auto;
    padding-bottom: $sp-2;
    -webkit-overflow-scrolling: touch;
  }

  &__item {
    flex: 0 0 auto;
    width: 108px;
    display: flex;
    flex-direction: column;
    gap: $sp-1;
    padding: $sp-3;
    border: 1px solid $c-line-soft;
    border-radius: 14px;
    transition: border-color 0.3s var(--ease-museum), background 0.3s var(--ease-museum);

    &:hover {
      border-color: $c-line;
      background: rgba(255, 255, 255, 0.03);
    }
  }

  &__art {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__name {
    font-size: 12px;
    font-weight: 350;
    word-break: keep-all;
    line-height: 1.3;
  }

  &__year {
    font-size: 9px;
    color: $c-text-3;
  }
}

// ---- CURATOR STUDIO 入口（V0.8）----
.curator-entry {
  margin-top: $sp-8;
  padding: $sp-5 $sp-6;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $sp-4;
    flex-wrap: wrap;

    .label {
      font-size: 10px;
      margin-bottom: $sp-1;
    }
  }

  &__desc {
    color: $c-text-3;
    max-width: 40ch;
  }

  &__list {
    margin-top: $sp-4;
    border-top: 1px solid $c-line-soft;
  }

  &__row {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: $sp-3;
    padding-block: $sp-3;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    text-align: left;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }
  }

  &__title {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__meta {
    margin-left: auto;
    font-size: 9px;
    color: $c-text-3;
  }

  &__from {
    margin-top: $sp-4;
    padding: $sp-2 $sp-4;
    border: 1px dashed $c-line;
    border-radius: 999px;
    color: $c-accent;
    font-size: 10px;
    letter-spacing: 0.1em;

    &:hover {
      background: rgba(184, 178, 164, 0.08);
    }
  }
}

// ---- 护照（规范 §39：进度条，不做经验/金币/等级）----
.passport {
  margin-top: $sp-8;
  padding: $sp-6;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $sp-4;
    flex-wrap: wrap;
  }

  &__count {
    margin-top: $sp-2;
    font-size: clamp(18px, 3vw, 26px);
    color: $c-accent;
    letter-spacing: 0.2em;
  }

  &__empty {
    margin-top: $sp-4;
    color: $c-text-3;
    max-width: 44ch;
  }

  &__rows {
    margin-top: $sp-5;
    display: flex;
    flex-direction: column;
    gap: $sp-3;
  }

  &__row {
    display: grid;
    grid-template-columns: 40px 96px 1fr 64px;
    align-items: center;
    gap: $sp-3;

    @include desktop {
      grid-template-columns: 48px 120px 1fr 72px;
    }
  }

  &__zh {
    font-size: 13px;
    word-break: keep-all;
  }

  &__en {
    font-size: 9px;
    color: $c-text-3;
    letter-spacing: 0.16em;
  }

  &__bar {
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  &__fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: $c-accent;
    transform-origin: left;
    transition: transform 0.8s var(--ease-museum);
  }

  &__num {
    font-size: 10px;
    color: $c-text-2;
    text-align: right;
  }

  &__note {
    margin-top: $sp-4;
    font-size: 9px;
    color: $c-text-3;
  }
}
</style>
