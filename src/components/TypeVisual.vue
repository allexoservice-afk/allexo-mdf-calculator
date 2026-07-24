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

/** Soft MDF wood tone (PVC stays white) */
const frameFill = computed(() => (props.materialId === 'pvc' ? '#f5f5f5' : '#d7c8a7'))
const frameStroke = computed(() => (props.materialId === 'pvc' ? '#6a7373' : '#ac9265'))
const sillFill = computed(() => (props.materialId === 'pvc' ? '#3f4b3f' : '#c4ae82'))
const patternId = computed(() => `glass-hatch-${props.variant}-${props.materialId}`)
const shineId = computed(() => `${patternId.value}-shine`)
</script>

<template>
  <svg
    class="type-visual"
    viewBox="0 0 116 76"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <!-- Soft translucent glass (like real glass) -->
      <linearGradient :id="shineId" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.78" />
        <stop offset="40%" stop-color="#e3f4fb" stop-opacity="0.38" />
        <stop offset="100%" stop-color="#b9dceb" stop-opacity="0.32" />
      </linearGradient>
      <!-- Light glass hatch -->
      <pattern
        :id="patternId"
        width="9"
        height="9"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(-45)"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="9"
          stroke="#1e2a33"
          stroke-width="0.65"
          stroke-opacity="0.18"
        />
      </pattern>
    </defs>

    <!-- Glass pane: wash + soft hatch + stroke -->
    <symbol :id="`${patternId}-pane`" viewBox="0 0 40 40">
      <rect width="40" height="40" :fill="`url(#${shineId})`" />
      <rect width="40" height="40" :fill="`url(#${patternId})`" />
      <rect width="40" height="40" fill="none" :stroke="frameStroke" stroke-width="1" />
    </symbol>

    <g v-if="variant === 'no-sill'">
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        :stroke="frameStroke"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 30 16 L 86 16 L 78 24 L 38 24 Z"
      />
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        :stroke="frameStroke"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 30 16 L 38 24 L 38 64 L 30 64 Z"
      />
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        :stroke="frameStroke"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 86 16 L 86 64 L 78 64 L 78 24 Z"
      />
      <use :href="`#${patternId}-pane`" x="38" y="24" width="40" height="40" />
      <line
        x1="58"
        y1="24"
        x2="58"
        y2="64"
        :stroke="frameStroke"
        stroke-width="0.85"
        opacity="0.4"
        vector-effect="non-scaling-stroke"
      />
    </g>

    <g v-else-if="variant === 'with-sill'">
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        :stroke="frameStroke"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 30 16 L 86 16 L 78 24 L 38 24 Z"
      />
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        :stroke="frameStroke"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 30 16 L 38 24 L 38 64 L 30 64 Z"
      />
      <path
        vector-effect="non-scaling-stroke"
        :fill="frameFill"
        :stroke="frameStroke"
        stroke-width="1"
        stroke-linejoin="miter"
        stroke-miterlimit="8"
        d="M 86 16 L 86 64 L 78 64 L 78 24 Z"
      />
      <use :href="`#${patternId}-pane`" x="38" y="24" width="40" height="40" />
      <line
        x1="58"
        y1="24"
        x2="58"
        y2="64"
        :stroke="frameStroke"
        stroke-width="0.85"
        opacity="0.4"
        vector-effect="non-scaling-stroke"
      />
      <rect
        x="25"
        y="64"
        width="66"
        height="2.5"
        :fill="sillFill"
        :stroke="frameStroke"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
    </g>

    <g v-else-if="variant === 'roller'">
      <rect
        x="22"
        y="4"
        width="72"
        height="14"
        :fill="frameFill"
        :stroke="frameStroke"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <line x1="26" y1="7.5" x2="90" y2="7.5" :stroke="frameStroke" stroke-width="0.6" opacity="0.35" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="11" x2="90" y2="11" :stroke="frameStroke" stroke-width="0.6" opacity="0.35" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="14.5" x2="90" y2="14.5" :stroke="frameStroke" stroke-width="0.6" opacity="0.35" vector-effect="non-scaling-stroke" />
      <rect x="30" y="18" width="8" height="40" :fill="frameFill" :stroke="frameStroke" stroke-width="1" vector-effect="non-scaling-stroke" />
      <rect x="78" y="18" width="8" height="40" :fill="frameFill" :stroke="frameStroke" stroke-width="1" vector-effect="non-scaling-stroke" />
      <use :href="`#${patternId}-pane`" x="38" y="18" width="40" height="40" />
      <line x1="58" y1="18" x2="58" y2="58" :stroke="frameStroke" stroke-width="0.85" opacity="0.4" vector-effect="non-scaling-stroke" />
    </g>

    <g v-else-if="variant === 'sill-roller'">
      <rect
        x="22"
        y="4"
        width="72"
        height="14"
        :fill="frameFill"
        :stroke="frameStroke"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <line x1="26" y1="7.5" x2="90" y2="7.5" :stroke="frameStroke" stroke-width="0.6" opacity="0.35" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="11" x2="90" y2="11" :stroke="frameStroke" stroke-width="0.6" opacity="0.35" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="14.5" x2="90" y2="14.5" :stroke="frameStroke" stroke-width="0.6" opacity="0.35" vector-effect="non-scaling-stroke" />
      <rect x="30" y="18" width="8" height="40" :fill="frameFill" :stroke="frameStroke" stroke-width="1" vector-effect="non-scaling-stroke" />
      <rect x="78" y="18" width="8" height="40" :fill="frameFill" :stroke="frameStroke" stroke-width="1" vector-effect="non-scaling-stroke" />
      <use :href="`#${patternId}-pane`" x="38" y="18" width="40" height="40" />
      <line x1="58" y1="18" x2="58" y2="58" :stroke="frameStroke" stroke-width="0.85" opacity="0.4" vector-effect="non-scaling-stroke" />
      <rect
        x="25"
        y="58"
        width="66"
        height="2.5"
        :fill="sillFill"
        :stroke="frameStroke"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
    </g>

    <g v-else-if="variant === 'roller-box-only'">
      <rect
        x="22"
        y="8"
        width="72"
        height="14"
        :fill="frameFill"
        :stroke="frameStroke"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <line x1="26" y1="11.5" x2="90" y2="11.5" :stroke="frameStroke" stroke-width="0.6" opacity="0.35" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="15" x2="90" y2="15" :stroke="frameStroke" stroke-width="0.6" opacity="0.35" vector-effect="non-scaling-stroke" />
      <line x1="26" y1="18.5" x2="90" y2="18.5" :stroke="frameStroke" stroke-width="0.6" opacity="0.35" vector-effect="non-scaling-stroke" />
      <use :href="`#${patternId}-pane`" x="38" y="22" width="40" height="40" />
      <line
        x1="58"
        y1="22"
        x2="58"
        y2="62"
        :stroke="frameStroke"
        stroke-width="0.85"
        opacity="0.4"
        vector-effect="non-scaling-stroke"
      />
    </g>

    <g v-else-if="variant === 'sill-only'">
      <use :href="`#${patternId}-pane`" x="38" y="22" width="40" height="40" />
      <line
        x1="58"
        y1="22"
        x2="58"
        y2="62"
        :stroke="frameStroke"
        stroke-width="0.85"
        opacity="0.4"
        vector-effect="non-scaling-stroke"
      />
      <rect
        x="34"
        y="62"
        width="48"
        height="2"
        :fill="sillFill"
        :stroke="frameStroke"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
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
