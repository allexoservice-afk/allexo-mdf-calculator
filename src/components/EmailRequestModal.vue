<script setup>
import { ref, watch } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { sendHtmlProposalToEmail, sendLeadEmails } from '../services/emailService.js'
import { getProposalDeliveryUrl } from '../services/proposalDelivery.js'
import { buildCalculationData } from '../utils/buildCalculationData.js'
import { allocateQuoteReference } from '../utils/quoteReference.js'
import { orderHasInvalidWindowDimensions } from '../utils/windowDimensions.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** `pro-lead` — клієнту + копія власнику; `self` — лише HTML на вказаний email */
  variant: { type: String, default: 'pro-lead' },
  lines: { type: Array, required: true },
  travelMeta: { type: Object, default: null },
  estimatedTotalEur: { type: Number, default: 0 },
  orderSubtotalEur: { type: Number, default: 0 },
  discountEuros: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  windowsCount: { type: Number, default: 0 },
  leadTimeNote: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const { locale, t } = useLocale()

const isSelf = () => props.variant === 'self'

const name = ref('')
const phone = ref('')
const email = ref('')
const address = ref('')
const comment = ref('')
const formError = ref('')
const submitting = ref(false)
/** @type {import('vue').Ref<'form' | 'success'>} */
const step = ref('form')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      name.value = ''
      phone.value = ''
      email.value = ''
      address.value = ''
      comment.value = ''
      formError.value = ''
      submitting.value = false
      step.value = 'form'
    }
  },
)

function validateEmail(v) {
  const s = String(v).trim()
  if (!s) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function buildLeadPayload() {
  const calculation_data = buildCalculationData(props.lines, {
    estimatedTotalEur: props.estimatedTotalEur,
    orderSubtotalEur: props.orderSubtotalEur,
    discountEuros: props.discountEuros,
    discountPercent: props.discountPercent,
    windowsCount: props.windowsCount,
    positionsCount: props.lines.length,
    locale: locale.value,
    travelMeta: props.travelMeta,
    leadTimeNote: props.leadTimeNote,
  })

  return {
    name: name.value.trim(),
    phone: phone.value.trim(),
    email: email.value.trim(),
    city: address.value.trim() || null,
    comment: comment.value.trim() || null,
    language: locale.value,
    total_price: Number(props.estimatedTotalEur) || 0,
    discount: Number(props.discountEuros) || 0,
    windows_count: Math.max(0, Math.round(Number(props.windowsCount) || 0)),
    positions_count: props.lines.length,
    calculation_data,
    skipClientCta: isSelf(),
  }
}

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('close')
}

async function onSubmit() {
  formError.value = ''

  if (orderHasInvalidWindowDimensions(props.lines)) {
    formError.value = t('lead.errMinDimensions')
    return
  }

  if (!getProposalDeliveryUrl()) {
    formError.value = t('lead.errEmailNotConfigured')
    return
  }

  const n = name.value.trim()
  const p = phone.value.trim()
  const em = email.value.trim()

  if (isSelf()) {
    if (!em) {
      formError.value = t('lead.errEmailRequired')
      return
    }
    if (!validateEmail(em)) {
      formError.value = t('lead.errInvalidEmail')
      return
    }
  } else {
    if (!n || !p) {
      formError.value = t('lead.errRequired')
      return
    }
    if (!em) {
      formError.value = t('lead.errEmailRequired')
      return
    }
    if (!validateEmail(em)) {
      formError.value = t('lead.errInvalidEmail')
      return
    }
  }

  submitting.value = true
  try {
    const lead = buildLeadPayload()
    lead.quote_reference = await allocateQuoteReference()

    if (isSelf()) {
      const mail = await sendHtmlProposalToEmail(lead, em)
      if (!mail.ok) {
        formError.value =
          mail.code === 'email_not_configured'
            ? t('lead.errEmailNotConfigured')
            : mail.error || t('lead.errEmailFailed')
        return
      }
    } else {
      const mail = await sendLeadEmails(lead)
      if (!mail.ok || !mail.clientSent) {
        formError.value =
          mail.code === 'email_not_configured'
            ? t('lead.errEmailNotConfigured')
            : typeof mail.error === 'string'
              ? mail.error
              : t('lead.errEmailFailed')
        return
      }
    }

    step.value = 'success'
  } catch (e) {
    console.error(e)
    formError.value = t('lead.errEmailFailed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="backdrop"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="isSelf() ? 'html-email-title' : 'lead-email-title'"
      @click="onBackdrop"
    >
      <div class="modal" @click.stop>
        <div class="modal__head">
          <h2 :id="isSelf() ? 'html-email-title' : 'lead-email-title'" class="modal__title">
            {{ isSelf() ? t('lead.titleHtmlSelf') : t('lead.titleEmail') }}
          </h2>
          <button type="button" class="modal__close" :aria-label="t('common.close')" @click="emit('close')">
            ×
          </button>
        </div>

        <template v-if="step === 'success'">
          <p class="modal__success" role="status">{{ t('lead.successHtmlSent') }}</p>
          <button type="button" class="btn-submit" @click="emit('close')">{{ t('common.close') }}</button>
        </template>

        <template v-else>
          <p class="modal__lead">{{ isSelf() ? t('lead.leadHtmlSelf') : t('lead.leadEmail') }}</p>
          <form class="form" @submit.prevent="onSubmit">
            <p v-if="formError" class="form__error" role="alert">{{ formError }}</p>

            <label v-if="!isSelf()" class="field">
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

            <label v-if="!isSelf()" class="field">
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
              <span class="field__label">
                {{ isSelf() ? t('lead.emailSelf') : t('lead.emailClient') }}
                <span class="req">{{ t('lead.required') }}</span>
              </span>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                class="field__input"
                :class="{ 'field__input--error': formError && !email.trim() }"
                @input="formError = ''"
              />
            </label>

            <label v-if="isSelf()" class="field">
              <span class="field__label">{{ t('lead.name') }}</span>
              <input v-model="name" type="text" autocomplete="name" class="field__input" />
            </label>

            <template v-if="!isSelf()">
              <label class="field">
                <span class="field__label">{{ t('lead.address') }}</span>
                <input v-model="address" type="text" autocomplete="street-address" class="field__input" />
              </label>

              <label class="field">
                <span class="field__label">{{ t('lead.comment') }}</span>
                <textarea v-model="comment" class="field__input field__textarea" rows="3" />
              </label>
            </template>

            <p class="form__gdpr">{{ t('lead.gdprConsent') }}</p>

            <button type="submit" class="btn-submit" :disabled="submitting">
              {{ submitting ? t('lead.sending') : t('lead.submitHtml') }}
            </button>
          </form>
        </template>
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

.modal__success {
  margin: 1rem 0 1.25rem;
  padding: 0.75rem 0.85rem;
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--allexo-teal);
  background: rgba(245, 241, 234, 0.9);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
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
  box-shadow: 0 0 0 3px var(--allexo-focus-ring);
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
  transition:
    background 0.18s,
    color 0.18s;
}

.btn-submit:hover:not(:disabled) {
  background: var(--allexo-teal-light);
  color: #fff;
}

.btn-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
