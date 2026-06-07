<script setup>
import { computed } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import TypeVisual from './TypeVisual.vue'

const props = defineProps({
  /** @type {import('vue').PropType<import('../constants/calculatorTypes.js').CalculatorTypeId>} */
  typeId: { type: String, required: true },
  visual: { type: String, required: true },
})

const emit = defineEmits(['select'])

const { t } = useLocale()

const title = computed(() => t(`types.${props.typeId}.title`))
const clientHint = computed(() => t(`types.${props.typeId}.hint`))
const clientHintRoller = computed(() => t(`types.${props.typeId}.hintRoller`))

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
      <TypeVisual :variant="visual" />
    </div>
    <h2 class="card__title">{{ title }}</h2>
    <p class="card__hint">{{ clientHint }}</p>
    <p v-if="clientHintRoller" class="card__hint card__hint--secondary">{{ clientHintRoller }}</p>
    <span class="card__cta">{{ t('card.selectType') }}</span>
  </button>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  width: 100%;
  padding: 1.25rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  background: var(--allexo-surface);
  box-shadow: var(--shadow);
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.card:hover {
  border-color: var(--allexo-accent);
  box-shadow: var(--shadow-md);
}

.card:focus-visible {
  outline: 2px solid var(--allexo-accent);
  outline-offset: 2px;
}

.card:active {
  transform: scale(0.99);
}

.card__visual {
  background: linear-gradient(145deg, #f0f6f6 0%, #e8f4f3 100%);
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
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--allexo-teal);
  line-height: 1.35;
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
  color: var(--allexo-accent);
}

@media (max-width: 768px) {
  .card {
    position: relative;
    z-index: auto;
    padding: 1rem;
    min-width: 0;
    overflow: hidden;
  }

  .card__visual {
    padding: 0.85rem;
    margin-bottom: 0.85rem;
    min-height: 92px;
  }

  .card__title {
    font-size: 1rem;
    line-height: 1.3;
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
