<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    required: true,
  },
  /** @type {import('vue').PropType<import('../constants/materialTypes.js').MaterialId>} */
  materialId: {
    type: String,
    default: 'mdf',
  },
})

const frameFill = computed(() => (props.materialId === 'pvc' ? '#ffffff' : '#c4a35a'))
</script>

<template>
  <svg
    class="type-visual"
    viewBox="0 0 116 76"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!--
      Скло у всіх варіантах: 40×40, x=38…78, cx=58. Підвіконник / короб лише зміщені вниз, без стиснення вікна.
      J=8 — бокові та верх (трапеція) для no-sill / with-sill. Ролетні боки ті самі x=30…38, 78…86.
    -->
    <g v-if="variant === 'no-sill'">
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        stroke="#0f3d3e"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 30 16 L 86 16 L 78 24 L 38 24 Z"
      />
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        stroke="#0f3d3e"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 30 16 L 38 24 L 38 64 L 30 64 Z"
      />
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        stroke="#0f3d3e"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 86 16 L 86 64 L 78 64 L 78 24 Z"
      />
      <rect
        x="38"
        y="24"
        width="40"
        height="40"
        fill="#e8f4f3"
        stroke="#0f3d3e"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <line
        x1="58"
        y1="24"
        x2="58"
        y2="64"
        stroke="#0f3d3e"
        stroke-width="0.75"
        opacity="0.24"
        vector-effect="non-scaling-stroke"
      />
    </g>

    <g v-else-if="variant === 'with-sill'">
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        stroke="#0f3d3e"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 30 16 L 86 16 L 78 24 L 38 24 Z"
      />
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        stroke="#0f3d3e"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 30 16 L 38 24 L 38 64 L 30 64 Z"
      />
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        stroke="#0f3d3e"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 86 16 L 86 64 L 78 64 L 78 24 Z"
      />
      <rect
        x="38"
        y="24"
        width="40"
        height="40"
        fill="#e8f4f3"
        stroke="#0f3d3e"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <line
        x1="58"
        y1="24"
        x2="58"
        y2="64"
        stroke="#0f3d3e"
        stroke-width="0.75"
        opacity="0.24"
        vector-effect="non-scaling-stroke"
      />
      <rect x="25" y="64" width="66" height="2.5" fill="#1a5c5e" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
    </g>

    <g v-else-if="variant === 'roller'">
      <rect x="22" y="4" width="72" height="14" :fill="frameFill" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="7.5" x2="90" y2="7.5" stroke="#0f3d3e" stroke-width="0.6" opacity="0.36" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="11" x2="90" y2="11" stroke="#0f3d3e" stroke-width="0.6" opacity="0.36" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="14.5" x2="90" y2="14.5" stroke="#0f3d3e" stroke-width="0.6" opacity="0.36" vector-effect="non-scaling-stroke" />
      <rect x="30" y="18" width="8" height="40" :fill="frameFill" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <rect x="78" y="18" width="8" height="40" :fill="frameFill" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <rect x="38" y="18" width="40" height="40" fill="#e8f4f3" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <line x1="58" y1="18" x2="58" y2="58" stroke="#0f3d3e" stroke-width="0.75" opacity="0.24" vector-effect="non-scaling-stroke" />
    </g>

    <g v-else-if="variant === 'sill-roller'">
      <rect x="22" y="4" width="72" height="14" :fill="frameFill" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="7.5" x2="90" y2="7.5" stroke="#0f3d3e" stroke-width="0.6" opacity="0.36" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="11" x2="90" y2="11" stroke="#0f3d3e" stroke-width="0.6" opacity="0.36" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="14.5" x2="90" y2="14.5" stroke="#0f3d3e" stroke-width="0.6" opacity="0.36" vector-effect="non-scaling-stroke" />
      <rect x="30" y="18" width="8" height="40" :fill="frameFill" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <rect x="78" y="18" width="8" height="40" :fill="frameFill" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <rect x="38" y="18" width="40" height="40" fill="#e8f4f3" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <line x1="58" y1="18" x2="58" y2="58" stroke="#0f3d3e" stroke-width="0.75" opacity="0.24" vector-effect="non-scaling-stroke" />
      <rect x="25" y="58" width="66" height="2.5" fill="#1a5c5e" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
    </g>

    <g v-else-if="variant === 'roller-box-only'">
      <rect x="22" y="8" width="72" height="14" :fill="frameFill" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="11.5" x2="90" y2="11.5" stroke="#0f3d3e" stroke-width="0.6" opacity="0.36" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="15" x2="90" y2="15" stroke="#0f3d3e" stroke-width="0.6" opacity="0.36" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="18.5" x2="90" y2="18.5" stroke="#0f3d3e" stroke-width="0.6" opacity="0.36" vector-effect="non-scaling-stroke" />
      <rect x="38" y="22" width="40" height="40" fill="#e8f4f3" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <line
        x1="58"
        y1="22"
        x2="58"
        y2="62"
        stroke="#0f3d3e"
        stroke-width="0.75"
        opacity="0.24"
        vector-effect="non-scaling-stroke"
      />
    </g>

    <g v-else-if="variant === 'sill-only'">
      <rect x="38" y="22" width="40" height="40" fill="#e8f4f3" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
      <line
        x1="58"
        y1="22"
        x2="58"
        y2="62"
        stroke="#0f3d3e"
        stroke-width="0.75"
        opacity="0.24"
        vector-effect="non-scaling-stroke"
      />
      <rect x="34" y="62" width="48" height="2" fill="#1a5c5e" stroke="#0f3d3e" stroke-width="1" vector-effect="non-scaling-stroke" />
    </g>
  </svg>
</template>

<style scoped>
.type-visual {
  width: 100%;
  max-width: 140px;
  height: auto;
  display: block;
  margin: 0 auto;
}
</style>
