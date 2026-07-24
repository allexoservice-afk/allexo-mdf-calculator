<script setup>
import { computed } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import TypeVisual from './TypeVisual.vue'

const props = defineProps({
  /** @type {import('vue').PropType<import('../constants/calculatorTypes.js').CalculatorTypeId>} */
  typeId: { type: String, required: true },
  /** @type {import('vue').PropType<import('../constants/materialTypes.js').MaterialId>} */
  materialId: { type: String, default: 'mdf' },
  visual: { type: String, required: true },
})

const emit = defineEmits(['select'])

const { t } = useLocale()

const title = computed(() => {
  if (props.materialId === 'pvc') {
    const pvc = t(`types.${props.typeId}.title_pvc`)
    if (pvc !== `types.${props.typeId}.title_pvc`) return pvc
  }
  return t(`types.${props.typeId}.title`)
})
const clientHint = computed(() => {
  if (props.materialId === 'pvc') {
    const pvc = t(`types.${props.typeId}.hint_pvc`)
    if (pvc !== `types.${props.typeId}.hint_pvc`) return pvc
  }
  return t(`types.${props.typeId}.hint`)
})
const clientHintRoller = computed(() => {
  if (props.materialId === 'pvc') return ''
  return t(`types.${props.typeId}.hintRoller`)
})

const ariaDescription = computed(() => {
  const parts = [clientHint.value]
  if (clientHintRoller.value) parts.push(clientHintRoller.value)
  return parts.join(' ')
})
</script>

<template>
  <button
    type="button"
    class="card"
    :aria-label="t('card.ariaPrefix') + ' ' + title + '. ' + ariaDescription"
    @click="emit('select')"
  >
    <div class="card__visual">
      <TypeVisual :variant="visual" :material-id="materialId" />
    </div>
    <h2 class="card__title">{{ title }}</h2>
    <p class="card__hint">{{ clientHint }}</p>
    <p v-if="clientHintRoller" class="card__hint card__hint--secondary">{{ clientHintRoller }}</p>
    <span class="card__cta">{{ t('card.selectType') }}</span>
  </button>
</template>

<style scoped>
.card {
  --card-brass: #b89a5c;
  --card-brass-hover: #8a6e3a;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  width: 100%;
  height: 100%;
  padding: 1.25rem;
  border: 1.5px solid #d4cfc4;
  border-radius: var(--radius-lg);
  background: var(--allexo-surface);
  box-shadow: 0 2px 8px rgba(26, 25, 23, 0.04);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.card:hover {
  border-color: #c4beb2;
  box-shadow: 0 10px 24px rgba(26, 25, 23, 0.09);
  transform: translateY(-4px);
}

.card:hover .card__cta {
  color: var(--card-brass-hover);
}

.card:focus-visible {
  outline: 2px solid var(--allexo-green);
  outline-offset: 2px;
}

.card:active {
  transform: translateY(-2px);
}

.card__visual {
  background: #f5f4f1;
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1rem;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card__title {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--allexo-olive);
  line-height: 1.3;
  min-height: calc(1.3em * 3);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.card__hint {
  margin: 0 0 0.35rem;
  font-size: 0.8125rem;
  color: var(--allexo-muted);
  line-height: 1.45;
  flex: 1;
}

.card__hint:last-child {
  margin-bottom: 1rem;
}

.card__hint--secondary {
  margin-top: -0.1rem;
}

.card__cta {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--card-brass);
  transition: color 0.2s ease;
}

@media (max-width: 768px) {
  .card {
    position: relative;
    z-index: auto;
    padding: 1rem;
    min-width: 0;
    overflow: hidden;
  }

  .card:hover {
    transform: translateY(-3px);
  }

  .card__visual {
    padding: 0.85rem;
    margin-bottom: 0.85rem;
    min-height: 92px;
    background: #f5f4f1;
  }

  .card__title {
    font-size: 0.9rem;
    line-height: 1.3;
    min-height: calc(1.3em * 3);
  }

  .card__hint {
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .card__cta {
    display: block;
    width: 100%;
    font-size: 0.82rem;
    line-height: 1.35;
    overflow-wrap: break-word;
  }
}
</style>
