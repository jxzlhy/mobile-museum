<script setup lang="ts">
// Original line-art "archival drawings" — one per form factor.
// Self-created, license-free stand-ins for photographic exhibits
// (spec §68: unclear license ⇒ do not use; we simply don't need one).

const props = defineProps<{
  form?: string | null
}>()

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linejoin': 'round',
  'stroke-linecap': 'round',
} as const

const key = { fill: 'currentColor', stroke: 'none' } as const
</script>

<template>
  <svg viewBox="0 0 120 240" class="silhouette" aria-hidden="true" focusable="false">
    <!-- brick -->
    <g v-if="form === 'brick'" v-bind="stroke">
      <rect x="86" y="18" width="7" height="58" rx="3" />
      <rect x="36" y="30" width="46" height="180" rx="7" />
      <rect x="44" y="44" width="30" height="22" rx="2" />
      <g v-bind="key">
        <template v-for="r in 4">
          <circle v-for="c in 3" :cx="46 + (c - 1) * 14" :cy="86 + (r - 1) * 18" r="3.2" />
        </template>
      </g>
      <line x1="36" y1="160" x2="82" y2="160" />
    </g>

    <!-- bar -->
    <g v-else-if="form === 'bar'" v-bind="stroke">
      <rect x="40" y="22" width="40" height="196" rx="8" />
      <rect x="46" y="38" width="28" height="56" rx="2" />
      <g v-bind="key">
        <template v-for="r in 5">
          <circle v-for="c in 3" :cx="48 + (c - 1) * 12" :cy="110 + (r - 1) * 18" r="3" />
        </template>
      </g>
    </g>

    <!-- flip -->
    <g v-else-if="form === 'flip'" v-bind="stroke">
      <rect x="40" y="14" width="40" height="102" rx="8" />
      <rect x="40" y="124" width="40" height="102" rx="8" />
      <line x1="40" y1="120" x2="80" y2="120" />
      <rect x="46" y="26" width="28" height="40" rx="2" />
      <g v-bind="key">
        <template v-for="r in 3">
          <circle v-for="c in 3" :cx="48 + (c - 1) * 12" :cy="150 + (r - 1) * 16" r="3" />
        </template>
      </g>
    </g>

    <!-- slider -->
    <g v-else-if="form === 'slider'" v-bind="stroke">
      <rect x="46" y="18" width="30" height="180" rx="7" />
      <rect x="36" y="60" width="44" height="164" rx="8" />
      <rect x="43" y="74" width="30" height="44" rx="2" />
      <g v-bind="key">
        <template v-for="r in 4">
          <circle v-for="c in 3" :cx="46 + (c - 1) * 13" :cy="134 + (r - 1) * 17" r="3" />
        </template>
      </g>
    </g>

    <!-- qwerty -->
    <g v-else-if="form === 'qwerty'" v-bind="stroke">
      <rect x="36" y="20" width="48" height="200" rx="9" />
      <rect x="43" y="34" width="34" height="62" rx="2" />
      <g v-bind="key">
        <template v-for="r in 4">
          <rect v-for="c in 5" :x="42 + (c - 1) * 8.4" :y="112 + (r - 1) * 17" width="6.4" height="9" rx="1.6" />
        </template>
      </g>
    </g>

    <!-- foldable -->
    <g v-else-if="form === 'foldable'" v-bind="stroke">
      <path d="M 38 28 Q 38 22 44 22 L 76 22 Q 82 22 82 28 L 82 212 Q 82 218 76 218 L 44 218 Q 38 218 38 212 Z" />
      <path d="M 56 22 Q 62 118 56 218" stroke-dasharray="3 5" />
      <rect x="45" y="34" width="30" height="150" rx="3" opacity="0.55" />
    </g>

    <!-- full-screen（全面屏） -->
    <g v-else-if="form === 'full-screen'" v-bind="stroke">
      <rect x="36" y="18" width="48" height="204" rx="10" />
      <rect x="52" y="22" width="16" height="5" rx="2.5" />
      <rect x="41" y="34" width="38" height="172" rx="2" opacity="0.5" />
    </g>

    <!-- pda -->
    <g v-else-if="form === 'pda'" v-bind="stroke">
      <rect x="34" y="24" width="52" height="192" rx="6" />
      <rect x="41" y="36" width="38" height="118" rx="2" />
      <g v-bind="key">
        <circle cx="60" cy="182" r="5" />
        <circle cx="45" cy="198" r="3.4" />
        <circle cx="60" cy="198" r="3.4" />
        <circle cx="75" cy="198" r="3.4" />
      </g>
    </g>

    <!-- touch (default) -->
    <g v-else v-bind="stroke">
      <rect x="34" y="20" width="52" height="200" rx="12" />
      <line x1="34" y1="42" x2="86" y2="42" />
      <line x1="34" y1="198" x2="86" y2="198" />
      <circle cx="60" cy="209" r="5" />
      <rect x="52" y="29" width="16" height="5" rx="2.5" />
    </g>
  </svg>
</template>

<style lang="scss" scoped>
.silhouette {
  color: rgba(245, 245, 245, 0.75);
}
</style>
