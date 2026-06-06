<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import GetQuoteLeadPanel from './GetQuoteLeadPanel.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  lines: { type: Array, required: true },
  windowsCount: { type: Number, required: true },
  estimatedTotalEur: { type: Number, required: true },
  discountEuros: { type: Number, required: true },
  discountPercent: { type: Number, required: true },
  orderSubtotalEur: { type: Number, required: true },
  travelMeta: { type: Object, default: null },
  invalidDims: { type: Boolean, default: false },
  leadTimeNote: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const { t } = useLocale()

const panelKey = ref(0)
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) panelKey.value += 1
  },
)

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const body = document.body
    if (!root || !body) return
    if (isOpen) {
      root.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
    } else {
      root.style.overflow = ''
      body.style.overflow = ''
    }
  },
  { immediate: true },
)

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('close')
}

function onKeydown(e) {
  if (e.key === 'Escape' && props.open) emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof window === 'undefined') return
    if (isOpen) {
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="gq-modal-backdrop"
      role="presentation"
      @click="onBackdrop"
    >
      <div
        class="gq-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="t('getQuote.title')"
        @click.stop
      >
        <button
          type="button"
          class="gq-modal__close"
          :aria-label="t('common.close')"
          @click="emit('close')"
        >
          ×
        </button>
        <GetQuoteLeadPanel
          :key="panelKey"
          layout="modal"
          :lines="lines"
          :windows-count="windowsCount"
          :estimated-total-eur="estimatedTotalEur"
          :discount-euros="discountEuros"
          :discount-percent="discountPercent"
          :order-subtotal-eur="orderSubtotalEur"
          :travel-meta="travelMeta"
          :invalid-dims="invalidDims"
          :lead-time-note="leadTimeNote"
          @close="emit('close')"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gq-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right))
    max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
  background: rgba(12, 20, 20, 0.55);
  box-sizing: border-box;
}

.gq-modal {
  position: relative;
  width: min(92vw, 560px);
  max-height: min(90vh, 720px);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--allexo-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px rgba(17, 17, 17, 0.2);
  padding: 1.35rem 1.25rem 1.5rem;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .gq-modal {
    width: min(94vw, 520px);
    padding: 1.5rem 1.5rem 1.65rem;
  }
}

.gq-modal__close {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  z-index: 2;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: var(--radius);
  background: var(--allexo-bg);
  color: var(--allexo-text);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.gq-modal__close:hover {
  background: var(--allexo-border);
}
</style>
