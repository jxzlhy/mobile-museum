<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { graphService, type GraphFocus, type MuseumGraphNode } from '@/services/graphService'
import { useStageScene } from '@/composables/useStageScene'
import { AmbientScene } from '@/three/scenes/AmbientScene'
import RelationGraph from '@/components/graph/RelationGraph.vue'
import MuseumButton from '@/components/common/MuseumButton.vue'
import AddToExhibition from '@/components/curator/AddToExhibition.vue'

// Historical Graph（V0.6 规范 §3–§10 / §42 / §49 / §65–§66）：
// 默认只看当前实体附近关系（Focus），主动扩展才进入 Depth 2；
// 必须提供非视觉替代（List View）。

useStageScene(() => new AmbientScene())

const route = useRoute()
const router = useRouter()

const focus = ref<GraphFocus | null>(null)
const status = ref<'loading' | 'ready' | 'empty'>('loading')
const depth = ref<1 | 2>(1)
const focusId = ref('phone:nokia-3310')
const expanded = ref(false)

const NODE_TYPE_LABELS: Record<string, string> = {
  phone: '展品',
  brand: '品牌',
  technology: '技术',
  era: '年代',
  event: '事件',
  'form-factor': '形态',
  story: '专题',
}

async function load() {
  status.value = 'loading'
  const raw = route.query.focus ? String(route.query.focus) : 'phone:nokia-3310'
  focusId.value = raw.includes(':') ? raw : `phone:${raw}`
  depth.value = expanded.value ? 2 : 1
  const result = await graphService.getFocus(focusId.value, depth.value)
  if (!result || result.nodes.length <= 1) {
    status.value = 'empty'
    focus.value = result
    return
  }
  focus.value = result
  status.value = 'ready'
  document.title = `${result.center.label} · 关系图谱 — 手机历史博物馆`
}

function onNodeSelect(nodeId: string) {
  const node = focus.value?.nodes.find((n) => n.id === nodeId)
  if (!node) return
  // 展品节点 → 跳展品页；其它类型 → 图内重新聚焦（§9）
  if (node.type === 'phone' && node.href) {
    router.push(node.href)
    return
  }
  expanded.value = false
  router.replace({ query: { focus: nodeId } })
}

function expand() {
  expanded.value = true
  void load()
}

function resetFocus() {
  expanded.value = false
  router.replace({ query: {} })
  void load()
}

onMounted(load)
watch(
  () => route.query.focus,
  (v, old) => {
    if (v !== old) void load()
  },
)

const others = computed(() =>
  focus.value ? focus.value.nodes.filter((n) => n.id !== focus.value!.center.id) : [],
)
</script>

<template>
  <div class="graph container">
    <header class="graph__head">
      <p class="label">HISTORICAL GRAPH · 关系图谱</p>
      <h1 class="heading-1" style="margin-top: 16px">一张档案网络</h1>
      <p class="body-lg graph__intro">每件展品都不是孤立的——品牌、年代、技术与专题把它连进历史。</p>
      <div class="graph__quick" aria-label="快速聚焦">
        <button class="graph__chip mono" :class="{ 'graph__chip--on': focusId.startsWith('phone:nokia-3310') }" @click="router.replace({ query: { focus: 'phone:nokia-3310' } })">NOKIA 3310</button>
        <button class="graph__chip mono" :class="{ 'graph__chip--on': focusId.startsWith('brand:nokia') }" @click="router.replace({ query: { focus: 'brand:nokia' } })">NOKIA</button>
        <button class="graph__chip mono" :class="{ 'graph__chip--on': focusId.startsWith('brand:motorola') }" @click="router.replace({ query: { focus: 'brand:motorola' } })">MOTOROLA</button>
        <button class="graph__chip mono" :class="{ 'graph__chip--on': focusId.startsWith('technology:') }" @click="router.replace({ query: { focus: 'technology:touchscreen' } })">TOUCHSCREEN</button>
        <button class="graph__chip mono" :class="{ 'graph__chip--on': focusId.startsWith('era:') }" @click="router.replace({ query: { focus: 'era:1990s' } })">1990s</button>
      </div>
    </header>

    <p v-if="status === 'loading'" class="label" style="padding-block: 96px">正在展开关系……</p>

    <div v-else-if="status === 'empty'" class="graph__empty glass-card">
      <p class="mono">NO DOCUMENTED CONNECTIONS</p>
      <p class="body-md">这件实体暂时没有已建档的关系。</p>
      <MuseumButton variant="line" @click="resetFocus">回到示例图谱</MuseumButton>
    </div>

    <template v-else-if="focus">
      <div class="graph__focus-head">
        <p class="label mono">{{ NODE_TYPE_LABELS[focus.center.type] }} · {{ focus.nodes.length }} NODES</p>
        <button v-if="focus.canExpand && depth === 1" class="graph__expand label" @click="expand">
          EXPAND · 展开二层关系 →
        </button>
        <span v-else-if="depth === 2" class="label graph__depth2">DEPTH 2 · 二层关系</span>
        <!-- V0.8 §43：Graph → Curator -->
        <AddToExhibition
          class="graph__curate"
          block-type="graph"
          :block-data="() => ({ focusId: focus!.center.id })"
          label="ADD TO EXHIBITION"
        />
      </div>

      <RelationGraph :focus="focus" @select="onNodeSelect" />

      <!-- List View：非视觉替代（规范 §49 / §65） -->
      <section class="graph__list" aria-label="关系清单">
        <p class="label graph__list-head">RELATED · 关系清单（{{ others.length }}）</p>
        <ul class="graph__rows">
          <li v-for="n in others" :key="n.id" class="graph__row">
            <button class="graph__row-focus" @click="onNodeSelect(n.id)">
              <span class="graph__row-label">{{ n.label }}</span>
              <span class="graph__row-meta label">
                {{ focus.reasons[n.id] ?? NODE_TYPE_LABELS[n.type] }}
              </span>
            </button>
            <router-link v-if="n.href && n.type !== 'phone'" :to="n.href" class="graph__row-open label">前往 →</router-link>
            <router-link v-else-if="n.type === 'phone'" :to="n.href ?? '#'" class="graph__row-open label">看展 →</router-link>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.graph {
  padding-top: calc(120px + env(safe-area-inset-top));
  padding-bottom: $sp-10;
  min-height: 100vh;
  min-height: 100dvh;

  &__head {
    .label {
      margin-bottom: $sp-2;
    }
  }

  &__intro {
    margin-top: $sp-3;
    color: $c-text-2;
  }

  &__quick {
    margin-top: $sp-5;
    display: flex;
    gap: $sp-2;
    flex-wrap: wrap;
  }

  &__chip {
    font-size: 10px;
    padding: 7px 14px;
    border: 1px solid $c-line-soft;
    border-radius: 999px;
    color: $c-text-3;
    transition: border-color 0.3s var(--ease-museum), color 0.3s var(--ease-museum);

    &:hover {
      color: $c-text;
    }

    &--on {
      color: $c-accent;
      border-color: rgba(184, 178, 164, 0.5);
    }
  }

  &__empty {
    margin-top: $sp-6;
    padding: $sp-7 $sp-6;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-2;

    .mono {
      font-size: 11px;
      letter-spacing: 0.2em;
      color: $c-text-3;
    }
  }

  &__focus-head {
    margin-top: $sp-7;
    margin-bottom: $sp-3;
    display: flex;
    align-items: center;
    gap: $sp-4;
    flex-wrap: wrap;
  }

  &__expand {
    font-size: 10px;
    color: $c-accent;
    padding: 7px 14px;
    border: 1px solid rgba(184, 178, 164, 0.4);
    border-radius: 999px;

    &:hover {
      background: rgba(184, 178, 164, 0.1);
    }
  }

  &__depth2 {
    font-size: 10px;
    color: $c-text-3;
  }

  &__curate {
    margin-left: auto;
  }

  &__list {
    margin-top: $sp-6;
  }

  &__list-head {
    font-size: 10px;
    color: $c-text-3;
    margin-bottom: $sp-2;
  }

  &__rows {
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: $sp-4;
    border-top: 1px solid $c-line-soft;
    padding-block: $sp-2;

    &:first-child {
      border-top: none;
    }
  }

  &__row-focus {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    text-align: left;
    padding: $sp-1 $sp-2;
    border-radius: 10px;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }
  }

  &__row-label {
    font-size: 15px;
    font-weight: 350;
    word-break: keep-all;
  }

  &__row-meta {
    font-size: 9px;
    color: $c-text-3;
    word-break: keep-all;
  }

  &__row-open {
    flex-shrink: 0;
    font-size: 10px;
    color: $c-text-3;

    &:hover {
      color: $c-accent;
    }
  }
}
</style>
