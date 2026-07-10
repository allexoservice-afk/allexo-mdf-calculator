<script setup>
import { computed } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { buildWindowSchematicSvg } from '../utils/windowSchematicSvg.js'

const props = defineProps({
  typeId: { type: String, required: true },
  win: { type: Object, required: true },
  materialId: { type: String, default: 'mdf' },
})

const { t } = useLocale()

const svgHtml = computed(() =>
  buildWindowSchematicSvg(props.typeId, props.win, t('common.mm'), props.materialId),
)
</script>

<template>
  <div class="window-schematic" v-html="svgHtml" />
</template>

<style scoped>
.window-schematic {
  flex-shrink: 0;
  width: 130px;
  line-height: 0;
}

.window-schematic :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
</style>
