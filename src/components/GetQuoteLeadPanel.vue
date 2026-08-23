<script setup>
import { computed, reactive, ref } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { isLeadSaveRlsError, saveLead } from '../services/leads.js'
import { sendLeadEmails } from '../services/emailService.js'
import { allocateQuoteReference } from '../utils/quoteReference.js'
import { trackMetaLead } from '../services/metaPixel.js'
import { buildCalculationData } from '../utils/buildCalculationData.js'
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from '../constants/contact.js'
import PrivacyPolicyModal from './PrivacyPolicyModal.vue'

const props = defineProps({
  lines: { type: Array, required: true },
  windowsCount: { type: Number, required: true },
  estimatedTotalEur: { type: Number, required: true },
  discountEuros: { type: Number, required: true },
  discountPercent: { type: Number, required: true },
  orderSubtotalEur: { type: Number, required: true },
  travelMeta: { type: Object, default: null },
  invalidDims: { type: Boolean, default: false },
  leadTimeNote: { type: String, default: '' },
  /** `inline` — у підсумку; `modal` — у діалогові */
  layout: { type: String, default: 'inline' },
})

const emit = defineEmits(['close'])

const { locale, t } = useLocale()

const isModal = computed(() => props.layout === 'modal')

/** @type {import('vue').Ref<'form' | 'success'>} */
const step = ref('form')

const name = ref('')
const phone = ref('')
const email = ref('')
const city = ref('')
const comment = ref('')
const showOptional = ref(false)

const formError = ref('')
const submitting = ref(false)
const privacyOpen = ref(false)
/** @type {import('vue').Ref<'full' | 'saved_only' | 'email_not_configured' | 'email_failed'>} */
const successKind = ref('full')

const fieldErrors = reactive({
  name: '',
  phone: '',
  email: '',
})

function clearFieldErrors() {
  fieldErrors.name = ''
  fieldErrors.phone = ''
  fieldErrors.email = ''
  formError.value = ''
}

function resetFormFields() {
  name.value = ''
  phone.value = ''
  email.value = ''
  city.value = ''
  comment.value = ''
  showOptional.value = false
  clearFieldErrors()
}

function validateEmail(v) {
  const s = String(v).trim()
  if (!s) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function validatePhone(v) {
  const digits = String(v).replace(/\D/g, '')
  return digits.length >= 8
}

function validateForm() {
  clearFieldErrors()
  let ok = true

  if (!name.value.trim()) {
    fieldErrors.name = t('getQuote.errNameRequired')
    ok = false
  }
  const phoneTrimmed = phone.value.trim()
  if (phoneTrimmed && !validatePhone(phoneTrimmed)) {
    fieldErrors.phone = t('getQuote.errInvalidPhone')
    ok = false
  }
  if (!email.value.trim()) {
    fieldErrors.email = t('getQuote.errEmailRequired')
    ok = false
  } else if (!validateEmail(email.value)) {
    fieldErrors.email = t('getQuote.errInvalidEmail')
    ok = false
  }

  return ok
}

function buildLeadPayload() {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `lead-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''

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
    id,
    created_at: new Date().toISOString(),
    name: name.value.trim(),
    phone: phone.value.trim() || null,
    email: email.value.trim(),
    city: city.value.trim() || null,
    preferred_contact_method: 'email',
    comment: comment.value.trim() || null,
    language: locale.value,
    total_price: Number(props.estimatedTotalEur) || 0,
    discount: Number(props.discountEuros) || 0,
    windows_count: Math.max(0, Math.round(Number(props.windowsCount) || 0)),
    positions_count: props.lines.length,
    calculation_data,
    page_url: pageUrl,
    user_agent: ua,
  }
}

async function onSubmit() {
  if (props.invalidDims) {
    formError.value = t('getQuote.errInvalidDims')
    return
  }
  if (!validateForm()) return

  submitting.value = true
  try {
    const lead = buildLeadPayload()
    lead.quote_reference = await allocateQuoteReference()
    const [saved, mail] = await Promise.all([saveLead(lead), sendLeadEmails(lead)])

    if (!saved.ok) {
      console.warn('[GetQuoteLeadPanel] saveLead:', saved.error, saved.code)
      if (mail.ok && mail.clientSent) {
        successKind.value = 'saved_only'
        resetFormFields()
        step.value = 'success'
        trackMetaLead()
        return
      }
      formError.value = isLeadSaveRlsError(saved)
        ? t('getQuote.errSupabaseRls')
        : saved.code === 'env_missing'
          ? t('getQuote.errSupabaseEnv')
          : saved.error || t('getQuote.errSubmit')
      return
    }

    if (mail.ok && mail.clientSent) {
      successKind.value = 'full'
    } else if (mail.code === 'email_not_configured') {
      successKind.value = 'email_not_configured'
    } else if (!mail.ok || !mail.clientSent) {
      successKind.value = 'email_failed'
    } else {
      successKind.value = 'saved_only'
    }

    resetFormFields()
    step.value = 'success'
    trackMetaLead()
  } catch (e) {
    console.error(e)
    formError.value = t('getQuote.errSubmit')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="gq" :class="{ 'gq--modal': isModal }" :aria-label="t('getQuote.title')">
    <template v-if="step === 'form'">
      <h3 class="gq__title">{{ t('getQuote.title') }}</h3>
      <p v-if="!isModal" class="gq__subtitle">{{ t('getQuote.subtitle') }}</p>

      <p v-if="formError" class="gq__err" role="alert">{{ formError }}</p>

      <label class="gq__field">
        <span class="gq__label">{{ t('getQuote.name') }} *</span>
        <input
          v-model="name"
          type="text"
          autocomplete="name"
          class="gq__input"
          :class="{ 'gq__input--error': fieldErrors.name }"
          @input="fieldErrors.name = ''"
        />
        <span v-if="fieldErrors.name" class="gq__field-err" role="alert">{{ fieldErrors.name }}</span>
      </label>

      <div class="gq__row">
        <label class="gq__field">
          <span class="gq__label">{{ t('getQuote.phone') }}</span>
          <input
            v-model="phone"
            type="tel"
            autocomplete="tel"
            class="gq__input"
            inputmode="tel"
            :placeholder="t('getQuote.phonePlaceholder')"
            :class="{ 'gq__input--error': fieldErrors.phone }"
            @input="fieldErrors.phone = ''"
          />
          <span v-if="fieldErrors.phone" class="gq__field-err" role="alert">{{ fieldErrors.phone }}</span>
        </label>

        <label class="gq__field">
          <span class="gq__label">{{ t('getQuote.email') }} *</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            class="gq__input"
            inputmode="email"
            :class="{ 'gq__input--error': fieldErrors.email }"
            @input="fieldErrors.email = ''"
          />
          <span v-if="fieldErrors.email" class="gq__field-err" role="alert">{{ fieldErrors.email }}</span>
        </label>
      </div>

      <button
        v-if="!isModal && !showOptional"
        type="button"
        class="gq__optional-toggle"
        @click="showOptional = true"
      >
        {{ t('getQuote.optionalToggle') }}
      </button>

      <div v-else-if="!isModal && showOptional" class="gq__optional">
        <label class="gq__field">
          <span class="gq__label">{{ t('getQuote.city') }}</span>
          <input v-model="city" type="text" autocomplete="address-level2" class="gq__input" />
        </label>
        <label class="gq__field gq__field--last">
          <span class="gq__label">{{ t('getQuote.comment') }}</span>
          <textarea v-model="comment" class="gq__input gq__textarea" rows="2" />
        </label>
      </div>

      <p class="gq__gdpr">
        {{ t('getQuote.gdprConsentPrefix') }}
        <button type="button" class="gq__gdpr-link" @click="privacyOpen = true">
          {{ t('privacy.link') }}
        </button>{{ t('getQuote.gdprConsentSuffix') }}
      </p>

      <button
        type="button"
        class="gq__submit"
        :disabled="submitting || invalidDims"
        @click="onSubmit"
      >
        {{ submitting ? t('getQuote.submitting') : t('getQuote.submitQuote') }}
      </button>
    </template>

    <template v-else>
      <div class="gq__success" role="status">
        <p class="gq__success-title">{{ t('getQuote.successTitle') }}</p>
        <p class="gq__success-body">
          {{
            successKind === 'full'
              ? t('getQuote.successSubmitted')
              : successKind === 'email_not_configured'
                ? t('getQuote.deliverySkippedEmail')
                : successKind === 'email_failed'
                  ? t('getQuote.errDelivery')
                  : t('getQuote.successBody')
          }}
        </p>
        <p class="gq__success-contact">
          <a :href="CONTACT_EMAIL_HREF">{{ CONTACT_EMAIL }}</a>
        </p>
        <button v-if="isModal" type="button" class="gq__close-btn" @click="emit('close')">
          {{ t('getQuote.closeModal') }}
        </button>
      </div>
    </template>

    <PrivacyPolicyModal :open="privacyOpen" @close="privacyOpen = false" />
  </div>
</template>

<style scoped>
.gq {
  margin-top: 1.25rem;
  padding: 1.25rem 1rem;
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  box-sizing: border-box;
}

.gq--modal {
  margin-top: 0;
  padding: 0.25rem 2rem 0 0;
  background: transparent;
  border: none;
  border-radius: 0;
}

@media (min-width: 480px) {
  .gq:not(.gq--modal) {
    padding: 1.5rem 1.35rem;
  }
}

.gq__title {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--allexo-teal);
  letter-spacing: -0.02em;
}

.gq__subtitle {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--allexo-muted);
}

.gq__row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

@media (min-width: 520px) {
  .gq:not(.gq--modal) .gq__row {
    grid-template-columns: 1fr 1fr;
    gap: 0 0.75rem;
  }
}

.gq__optional-toggle {
  margin: 0 0 0.75rem;
  padding: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--allexo-teal);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.gq__optional-toggle:hover {
  color: var(--allexo-teal-light);
}

.gq__optional {
  margin-bottom: 0.25rem;
}

.gq__field--last {
  margin-bottom: 0.65rem;
}

.gq__field {
  display: block;
  margin-bottom: 0.85rem;
}

.gq__label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
  font-weight: 650;
  color: var(--allexo-muted);
}

.gq__input {
  width: 100%;
  min-height: 3rem;
  padding: 0.65rem 0.85rem;
  font-size: 1rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  box-sizing: border-box;
  background: #fff;
  font-family: inherit;
}

.gq__input--error {
  border-color: #b42318;
}

.gq__field-err {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #b42318;
}

.gq__textarea {
  min-height: 3.25rem;
  resize: vertical;
}

.gq__gdpr {
  margin: 0 0 0.85rem;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--allexo-muted);
}

.gq__gdpr-link {
  display: inline;
  padding: 0;
  font: inherit;
  font-size: inherit;
  font-weight: 650;
  color: var(--allexo-teal);
  text-decoration: underline;
  text-underline-offset: 2px;
  background: none;
  border: none;
  cursor: pointer;
}

.gq__gdpr-link:hover {
  color: var(--allexo-teal-light);
}

.gq__submit {
  width: 100%;
  min-height: 3.25rem;
  margin-top: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
  background: var(--allexo-teal);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition:
    background 0.18s,
    color 0.18s;
}

.gq__submit:hover:not(:disabled) {
  background: var(--allexo-teal-light);
  color: #fff;
}

.gq__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.gq__err {
  margin: 0 0 0.75rem;
  padding: 0.55rem 0.65rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #b42318;
  background: rgba(180, 35, 24, 0.08);
  border-radius: var(--radius);
}

.gq__success {
  padding: 0.5rem 0 0.25rem;
}

.gq__success-title {
  margin: 0 0 0.4rem;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--allexo-teal);
}

.gq__success-body {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.gq__success-contact {
  margin: 0.75rem 0 0;
  font-size: 0.95rem;
}

.gq__success-contact a {
  color: var(--allexo-teal);
  font-weight: 600;
  text-decoration: none;
}

.gq__success-contact a:hover {
  text-decoration: underline;
  color: var(--allexo-text);
}

.gq__close-btn {
  width: 100%;
  min-height: 3rem;
  margin-top: 1rem;
  font-size: 1rem;
  font-weight: 700;
  font-family: inherit;
  color: #fff;
  background: var(--allexo-teal);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition:
    background 0.18s,
    color 0.18s;
}

.gq__close-btn:hover {
  background: var(--allexo-teal-light);
  color: #fff;
}

</style>
