<script setup>
import { computed, reactive, ref } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { saveLead } from '../services/leads.js'
import { sendLeadEmails } from '../services/emailService.js'
import { buildCalculationData } from '../utils/buildCalculationData.js'
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from '../constants/contact.js'

const props = defineProps({
  lines: { type: Array, required: true },
  windowsCount: { type: Number, required: true },
  estimatedTotalEur: { type: Number, required: true },
  discountEuros: { type: Number, required: true },
  discountPercent: { type: Number, required: true },
  orderSubtotalEur: { type: Number, required: true },
  travelMeta: { type: Object, default: null },
  invalidDims: { type: Boolean, default: false },
  leadTimeNote: { type: String, required: true },
})

const { locale, t } = useLocale()

/** @type {import('vue').Ref<'form' | 'success'>} */
const step = ref('form')

const name = ref('')
const phone = ref('')
const email = ref('')
const city = ref('')
/** @type {import('vue').Ref<'whatsapp' | 'email' | 'phone'>} */
const preferredContactMethod = ref('email')
const comment = ref('')

const formError = ref('')
const submitting = ref(false)
/** @type {import('vue').Ref<'full' | 'saved_only' | 'email_not_configured' | 'email_failed'>} */
const successKind = ref('full')

const fieldErrors = reactive({
  name: '',
  phone: '',
  email: '',
})

const contactOptions = computed(() => [
  { value: 'whatsapp', label: t('getQuote.contactWhatsapp') },
  { value: 'email', label: t('getQuote.contactEmail') },
  { value: 'phone', label: t('getQuote.contactPhone') },
])

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
  preferredContactMethod.value = 'email'
  comment.value = ''
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
  if (!phone.value.trim()) {
    fieldErrors.phone = t('getQuote.errPhoneRequired')
    ok = false
  } else if (!validatePhone(phone.value)) {
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

  if (!ok) formError.value = t('getQuote.errRequired')
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
    phone: phone.value.trim(),
    email: email.value.trim(),
    city: city.value.trim() || null,
    preferred_contact_method: preferredContactMethod.value,
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
    const saved = await saveLead(lead)
    if (!saved.ok) {
      formError.value = saved.error || t('getQuote.errSubmit')
      return
    }

    const mail = await sendLeadEmails(lead)
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
  } catch (e) {
    console.error(e)
    formError.value = t('getQuote.errSubmit')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="gq" :aria-label="t('getQuote.title')">
    <template v-if="step === 'form'">
      <h3 class="gq__title">{{ t('getQuote.title') }}</h3>
      <p class="gq__subtitle">{{ t('getQuote.subtitle') }}</p>

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

      <label class="gq__field">
        <span class="gq__label">{{ t('getQuote.phone') }} *</span>
        <input
          v-model="phone"
          type="tel"
          autocomplete="tel"
          class="gq__input"
          inputmode="tel"
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

      <label class="gq__field">
        <span class="gq__label">{{ t('getQuote.city') }}</span>
        <input v-model="city" type="text" autocomplete="address-level2" class="gq__input" />
      </label>

      <label class="gq__field">
        <span class="gq__label">{{ t('getQuote.preferredContactMethod') }}</span>
        <select v-model="preferredContactMethod" class="gq__input gq__select">
          <option v-for="opt in contactOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </label>

      <label class="gq__field">
        <span class="gq__label">{{ t('getQuote.comment') }}</span>
        <textarea v-model="comment" class="gq__input gq__textarea" rows="3" />
      </label>

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
      </div>
      <p class="gq__lead">{{ leadTimeNote }}</p>
    </template>
  </div>
</template>

<style scoped>
.gq {
  margin-top: 1.25rem;
  padding: 1.25rem 1rem;
  background: linear-gradient(165deg, rgba(15, 61, 62, 0.06), rgba(196, 163, 90, 0.08));
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  box-sizing: border-box;
}

@media (min-width: 480px) {
  .gq {
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
  margin: 0 0 1.1rem;
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--allexo-muted);
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

.gq__select {
  appearance: auto;
}

.gq__textarea {
  min-height: 4.5rem;
  resize: vertical;
}

.gq__submit {
  width: 100%;
  min-height: 3.25rem;
  margin-top: 0.25rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
  background: var(--allexo-teal);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
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
  color: var(--accent, #c9a227);
  font-weight: 600;
  text-decoration: none;
}

.gq__success-contact a:hover {
  text-decoration: underline;
  color: var(--allexo-text);
}

.gq__lead {
  margin: 1rem 0 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--allexo-muted);
}
</style>
