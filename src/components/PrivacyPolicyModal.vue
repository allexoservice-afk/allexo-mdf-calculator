<script setup>
import { onBeforeUnmount, watch } from 'vue'
import { useLocale } from '../i18n/useLocale.js'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const { t } = useLocale()

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
      @click="onBackdrop"
    >
      <div class="modal" @click.stop>
        <div class="modal__head">
          <h2 id="privacy-title" class="modal__title">{{ t('privacy.title') }}</h2>
          <button type="button" class="modal__close" :aria-label="t('common.close')" @click="emit('close')">
            ×
          </button>
        </div>
        <ul class="modal__list">
          <li>{{ t('privacy.bullet1') }}</li>
          <li>{{ t('privacy.bullet2') }}</li>
          <li>{{ t('privacy.bullet3') }}</li>
          <li>{{ t('privacy.bullet4') }}</li>
        </ul>
        <button type="button" class="modal__ok" @click="emit('close')">{{ t('common.close') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 62;
  background: rgba(28, 36, 36, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}

@media (min-width: 640px) {
  .backdrop {
    align-items: center;
    padding: 1rem;
  }
}

.modal {
  width: 100%;
  max-width: 420px;
  max-height: min(88vh, 560px);
  overflow-y: auto;
  background: var(--allexo-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-md);
  padding: 1.25rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
}

@media (min-width: 640px) {
  .modal {
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }
}

.modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.modal__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--allexo-teal);
  line-height: 1.3;
}

.modal__close {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  background: var(--allexo-bg);
  color: var(--allexo-text);
  border-radius: var(--radius);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.modal__close:hover {
  background: var(--allexo-border);
}

.modal__list {
  margin: 1rem 0 1.25rem;
  padding: 0 0 0 1.15rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--allexo-text);
}

.modal__list li {
  margin: 0.45rem 0;
}

.modal__list li:first-child {
  margin-top: 0;
}

.modal__ok {
  width: 100%;
  min-height: 2.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--allexo-teal);
  background: var(--allexo-bg);
  border: 1px solid var(--allexo-teal);
  border-radius: var(--radius);
  cursor: pointer;
}

.modal__ok:hover {
  background: var(--allexo-surface);
}
</style>
