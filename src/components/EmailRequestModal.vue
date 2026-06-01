<script setup>
import { ref, watch } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { buildAllexoOfferText } from '../utils/offerText.js'
import { orderHasInvalidWindowDimensions } from '../utils/windowDimensions.js'
import { CONTACT_EMAIL } from '../constants/contact.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  lines: { type: Array, required: true },
  travelMeta: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const { locale, t } = useLocale()

const name = ref('')
const phone = ref('')
const address = ref('')
const comment = ref('')
const formError = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      name.value = ''
      phone.value = ''
      address.value = ''
      comment.value = ''
      formError.value = ''
    }
  },
)

function buildMailBody() {
  const offerText = buildAllexoOfferText(props.lines, locale.value, props.travelMeta)
  if (!offerText) return ''
  const n = name.value.trim()
  const p = phone.value.trim()
  const addr = String(address.value ?? '').trim() || t('lead.notSpecified')
  const comm = String(comment.value ?? '').trim() || t('lead.notSpecified')
  return (
    offerText +
    '\n\n' +
    t('lead.clientTitle') +
    '\n' +
    t('lead.clientName') +
    ' ' +
    n +
    '\n' +
    t('lead.clientPhone') +
    ' ' +
    p +
    '\n' +
    t('lead.clientAddress') +
    ' ' +
    addr +
    '\n' +
    t('lead.clientComment') +
    ' ' +
    comm +
    '\n\n' +
    t('lead.contactMe')
  )
}

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('close')
}

function onSubmit() {
  formError.value = ''
  const n = name.value.trim()
  const p = phone.value.trim()
  if (!n || !p) {
    formError.value = t('lead.errRequired')
    return
  }
  const text = buildMailBody()
  if (!text) {
    formError.value = t('lead.errNoLines')
    return
  }
  if (orderHasInvalidWindowDimensions(props.lines)) {
    formError.value = t('lead.errMinDimensions')
    return
  }
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('lead.mailSubject'))}&body=${encodeURIComponent(text)}`
  window.open(mailto, '_blank', 'noopener,noreferrer')
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-email-title"
      @click="onBackdrop"
    >
      <div class="modal" @click.stop>
        <div class="modal__head">
          <h2 id="lead-email-title" class="modal__title">{{ t('lead.titleEmail') }}</h2>
          <button type="button" class="modal__close" :aria-label="t('common.close')" @click="emit('close')">
            ×
          </button>
        </div>
        <p class="modal__lead">{{ t('lead.leadEmail') }}</p>
        <form class="form" @submit.prevent="onSubmit">
          <p v-if="formError" class="form__error" role="alert">{{ formError }}</p>

          <label class="field">
            <span class="field__label">{{ t('lead.name') }} <span class="req">{{ t('lead.required') }}</span></span>
            <input
              v-model="name"
              type="text"
              autocomplete="name"
              class="field__input"
              :class="{ 'field__input--error': formError && !name.trim() }"
              @input="formError = ''"
            />
          </label>

          <label class="field">
            <span class="field__label">{{ t('lead.phone') }} <span class="req">{{ t('lead.required') }}</span></span>
            <input
              v-model="phone"
              type="tel"
              autocomplete="tel"
              class="field__input"
              :class="{ 'field__input--error': formError && !phone.trim() }"
              @input="formError = ''"
            />
          </label>

          <label class="field">
            <span class="field__label">{{ t('lead.address') }}</span>
            <input v-model="address" type="text" autocomplete="street-address" class="field__input" />
          </label>

          <label class="field">
            <span class="field__label">{{ t('lead.comment') }}</span>
            <textarea v-model="comment" class="field__input field__textarea" rows="3" />
          </label>

          <p class="form__gdpr">{{ t('lead.gdprConsent') }}</p>

          <button type="submit" class="btn-submit">{{ t('lead.submit') }}</button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
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
  max-width: 440px;
  max-height: min(92vh, 640px);
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
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--allexo-teal);
  line-height: 1.25;
}

.modal__close {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
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

.modal__lead {
  margin: 0.65rem 0 1.1rem;
  font-size: 0.875rem;
  color: var(--allexo-muted);
  line-height: 1.45;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form__error {
  margin: 0;
  padding: 0.55rem 0.65rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--allexo-danger);
  background: #fef3f2;
  border: 1px solid rgba(180, 35, 24, 0.25);
  border-radius: var(--radius);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.req {
  color: var(--allexo-danger);
}

.field__input {
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  font-size: 1rem;
  background: var(--allexo-surface);
  font-family: inherit;
}

.field__textarea {
  resize: vertical;
  min-height: 4.5rem;
}

.field__input:focus {
  outline: none;
  border-color: var(--allexo-teal);
  box-shadow: 0 0 0 3px rgba(15, 61, 62, 0.12);
}

.field__input--error {
  border-color: var(--allexo-danger);
}

.form__gdpr {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--allexo-muted);
}

.btn-submit {
  margin-top: 0.35rem;
  width: 100%;
  padding: 1rem 1.25rem;
  min-height: 3.15rem;
  font-size: 1.05rem;
  font-weight: 700;
  font-family: inherit;
  color: #fff;
  background: var(--allexo-teal);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  box-shadow: var(--shadow-md);
}

.btn-submit:hover {
  background: var(--allexo-teal-light);
}
</style>
