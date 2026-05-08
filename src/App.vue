<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CALCULATOR_TYPES } from './constants/calculatorTypes.js'
import { useOrder } from './composables/useOrder.js'
import { useLocale } from './i18n/useLocale.js'
import Hero from './components/Hero.vue'
import WorksGallery from './components/WorksGallery.vue'
import CalculatorCard from './components/CalculatorCard.vue'
import OrderFormModal from './components/OrderFormModal.vue'
import OrderSummary from './components/OrderSummary.vue'
import { CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF } from './constants/contact.js'
import { CONTACT_WHATSAPP_HREF } from './constants/contact.js'
import PrivacyPolicyModal from './components/PrivacyPolicyModal.vue'
import { normalizeStoredWindow, normalizeWindowQuantity } from './constants/sizeCategories.js'
import {
  quoteRollerBoxOnlyRoundedEuros,
  quoteWindowRoundedEuros,
  quoteWindowsillOnlyRoundedEuros,
} from './pricing/windowQuote.js'
import { formatEuroExclVat } from './utils/priceDisplay.js'
import { lineWindowEligibleForAutoQuote, windowEligibleForAutoQuote } from './utils/windowDimensions.js'
import { getTypeById } from './constants/calculatorTypes.js'
import { isProUnlocked } from './constants/proUnlock.js'

const { lines, addLine, removeLine, clearOrder } = useOrder()
const { locale, t } = useLocale()

/** @type {import('vue').Ref<import('./constants/calculatorTypes.js').CalculatorTypeId | null>} */
const selectedTypeId = ref(null)
const formOpen = ref(false)
const privacyOpen = ref(false)

/** @param {import('./constants/calculatorTypes.js').CalculatorTypeId} id */
function openForm(id) {
  selectedTypeId.value = id
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  selectedTypeId.value = null
}

/** @param {Parameters<typeof addLine>[0]} payload */
function onSubmit(payload) {
  const { uiMode, ...rest } = /** @type {any} */ (payload)
  addLine(rest)
  if (uiMode === 'client') {
    scrollToSummary()
    flashSummary()
  }
}

function scrollToSummary() {
  const el = document.getElementById('summary')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const summaryFlash = ref(false)
let _flashTimer = /** @type {number | null} */ (null)
function flashSummary() {
  summaryFlash.value = true
  if (_flashTimer != null) window.clearTimeout(_flashTimer)
  _flashTimer = window.setTimeout(() => {
    summaryFlash.value = false
    _flashTimer = null
  }, 1200)
}

const showWaFab = ref(false)
let _io = /** @type {IntersectionObserver | null} */ (null)

const proActive = ref(false)
function syncProActive() {
  proActive.value = isProUnlocked()
}

onMounted(() => {
  syncProActive()
  if (typeof window !== 'undefined') {
    window.addEventListener('allexo-pro-change', syncProActive)
  }

  const el = document.getElementById('calculator') || document.getElementById('summary')
  if (!el || typeof IntersectionObserver === 'undefined') {
    showWaFab.value = true
    return
  }
  _io = new IntersectionObserver(
    (entries) => {
      const e = entries[0]
      showWaFab.value = !!e?.isIntersecting
    },
    { root: null, threshold: 0.15 },
  )
  _io.observe(el)
})

onBeforeUnmount(() => {
  if (_io) _io.disconnect()
  _io = null
  if (typeof window !== 'undefined') {
    window.removeEventListener('allexo-pro-change', syncProActive)
  }
  if (_flashTimer != null) window.clearTimeout(_flashTimer)
  _flashTimer = null
})

const CONTACT_WHATSAPP_PHONE = '32493860753'

function openWhatsAppFromSticky() {
  const totalRaw = orderTotalEuros.value
  const total = formatEuroExclVat(payableOrderTotalEuros.value, locale.value)
  const count = Array.isArray(lines.value) ? lines.value.length : 0

  const types = Array.from(
    new Set(
      (lines.value ?? [])
        .map((l) => String(l?.typeId ?? ''))
        .filter(Boolean)
        .map((id) => t(`types.${id}.title`)),
    ),
  ).join(', ')

  const minLine =
    totalRaw > 0 && totalRaw < MIN_ORDER_EUR
      ? `\nМінімальне замовлення: ${formatEuroExclVat(MIN_ORDER_EUR, locale.value)} (без ПДВ)\nДо мінімального: ${formatEuroExclVat(minOrderDiffEuros.value, locale.value)}`
      : ''

  const text =
    `Доброго дня!\n` +
    `Хочу отримати прорахунок:\n` +
    `Сума: ${total}\n` +
    `Кількість позицій: ${count}\n` +
    `Тип робіт: ${types || '—'}\n` +
    `${minLine}\n` +
    `Можете уточнити деталі?`

  const url = `https://wa.me/${CONTACT_WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openEmailFromSticky() {
  const totalRaw = orderTotalEuros.value
  const total = formatEuroExclVat(payableOrderTotalEuros.value, locale.value)
  const count = Array.isArray(lines.value) ? lines.value.length : 0

  const types = Array.from(
    new Set(
      (lines.value ?? [])
        .map((l) => String(l?.typeId ?? ''))
        .filter(Boolean)
        .map((id) => t(`types.${id}.title`)),
    ),
  ).join(', ')

  const subject = 'ALLEXO · Запит на прорахунок'
  const minLine =
    totalRaw > 0 && totalRaw < MIN_ORDER_EUR
      ? `\nМінімальне замовлення: ${formatEuroExclVat(MIN_ORDER_EUR, locale.value)} (без ПДВ)\nДо мінімального: ${formatEuroExclVat(minOrderDiffEuros.value, locale.value)}`
      : ''

  const body =
    `Доброго дня!\n\n` +
    `Хочу отримати прорахунок:\n` +
    `Сума: ${total}\n` +
    `Кількість позицій: ${count}\n` +
    `Тип робіт: ${types || '—'}\n\n` +
    `${minLine}\n\n` +
    `Можете уточнити деталі?`

  const email = String(CONTACT_EMAIL_HREF || '').replace(/^mailto:/, '')
  const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = url
}

/** @param {Record<string, unknown>} line */
function windowsForLine(line) {
  const tid = typeof line.typeId === 'string' ? line.typeId : undefined
  if (Array.isArray(line.windows) && line.windows.length > 0) {
    return line.windows.map((w) => normalizeStoredWindow(w, tid)).filter(Boolean)
  }
  return []
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowPriceEuros(line, win) {
  if (!win) return 0
  const tid = line.typeId
  if (tid === 'roller_box') {
    const wm = Number(win.widthMm)
    const rh = Number(win.rollerBoxHeightMm ?? win.heightMm)
    if (!lineWindowEligibleForAutoQuote('roller_box', win)) return 0
    return quoteRollerBoxOnlyRoundedEuros(wm, rh)
  }
  if (tid === 'windowsill') {
    const wm = Number(win.widthMm)
    const d = Number(win.windowsillDepthMm ?? win.heightMm)
    if (!lineWindowEligibleForAutoQuote('windowsill', win)) return 0
    return quoteWindowsillOnlyRoundedEuros(wm, d)
  }
  const ty = getTypeById(tid)
  if (!ty) return 0
  const wm = Number(win.widthMm)
  const hm = Number(win.heightMm)
  if (!windowEligibleForAutoQuote(wm, hm)) return 0
  return quoteWindowRoundedEuros(
    wm,
    hm,
    /** @type {import('./constants/sizeCategories.js').SizeCategoryId} */ (win.depthCategory),
    ty.hasSill,
    ty.hasRoller,
    typeof win.windowsillDepthMm === 'number' ? win.windowsillDepthMm : null,
    win.rollerCategory != null
      ? /** @type {import('./constants/sizeCategories.js').SizeCategoryId} */ (win.rollerCategory)
      : null,
  )
}

/** Підсумок робіт без виїзду (той самий підхід, що й у summary). */
const orderTotalEuros = computed(() =>
  lines.value.reduce((sum, line) => {
    const L = /** @type {Record<string, unknown>} */ (line)
    return (
      sum +
      windowsForLine(L).reduce(
        (s, w) => s + windowPriceEuros(L, w) * normalizeWindowQuantity(w.quantity),
        0,
      )
    )
  }, 0),
)

const showStickyTotal = computed(() => Array.isArray(lines.value) && lines.value.length > 0)

const MIN_ORDER_EUR = 500
const payableOrderTotalEuros = computed(() =>
  orderTotalEuros.value > 0 && orderTotalEuros.value < MIN_ORDER_EUR ? MIN_ORDER_EUR : orderTotalEuros.value,
)
const minOrderDiffEuros = computed(() =>
  orderTotalEuros.value > 0 && orderTotalEuros.value < MIN_ORDER_EUR ? MIN_ORDER_EUR - orderTotalEuros.value : 0,
)
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header__inner content-container hero">
        <div class="header__row">
          <Hero />
        </div>

        <div class="hero-corner-contacts" role="region" :aria-label="t('contacts.title')">
          <a class="hero-corner-contacts__link" :href="CONTACT_EMAIL_HREF" :aria-label="t('contacts.emailAria')">
            {{ t('contacts.emailDisplay') }}
          </a>
          <a class="hero-corner-contacts__link" :href="CONTACT_PHONE_HREF" :aria-label="t('contacts.phoneAria')">
            {{ t('contacts.phoneDisplay') }}
          </a>
        </div>
      </div>
    </header>

    <main class="main content-container">
      <section class="about" :aria-label="t('about.aria')">
        <h2 class="about__title">{{ t('about.title') }}</h2>
        <div class="about__copy">
          <p class="about__line">{{ t('about.line1') }}</p>
          <p class="about__line about__line--secondary">{{ t('about.line2') }}</p>
        </div>
      </section>

      <WorksGallery />

      <ul class="steps" :aria-label="t('app.stepsAria')">
        <li class="steps__item">
          <span class="steps__label">{{ t('app.step1Label') }}</span> {{ t('app.step1') }}
        </li>
        <li class="steps__item">
          <span class="steps__label">{{ t('app.step2Label') }}</span> {{ t('app.step2') }}
        </li>
        <li class="steps__item">
          <span class="steps__label">{{ t('app.step3Label') }}</span> {{ t('app.step3') }}
        </li>
      </ul>

      <section class="social-proof" :aria-label="t('proof.aria')">
        <div class="social-proof__card">
          <p class="social-proof__stars" aria-hidden="true">★★★★★</p>
          <p class="social-proof__quote">{{ t('proof.quote') }}</p>
          <p class="social-proof__meta">{{ t('proof.meta') }}</p>
        </div>
      </section>

      <section id="calculator" class="calc">
        <div class="grid">
          <CalculatorCard
            v-for="ty in CALCULATOR_TYPES"
            :key="ty.id"
            :type-id="ty.id"
            :visual="ty.visual"
            @select="openForm(ty.id)"
          />
        </div>

        <div id="summary" :class="{ 'summary-flash': summaryFlash }">
          <OrderSummary :lines="lines" @remove="removeLine" @clear="clearOrder" />
        </div>
      </section>
    </main>

    <div v-if="showStickyTotal" class="sticky-total" role="region" :aria-label="t('summary.stickyTotalAria')">
      <div class="sticky-total__inner content-container">
        <p class="sticky-total__sum">
          {{ t('summary.workSubtotal') }} {{ formatEuroExclVat(payableOrderTotalEuros, locale) }}
        </p>
        <div class="sticky-total__actions">
          <button type="button" class="sticky-total__btn sticky-total__btn--ghost" @click="scrollToSummary">
            {{ t('summary.title') }}
          </button>
          <button type="button" class="sticky-total__btn sticky-total__btn--wa" @click="openWhatsAppFromSticky">
            {{ t('summary.whRequest') }}
          </button>
          <button type="button" class="sticky-total__btn sticky-total__btn--secondary" @click="openEmailFromSticky">
            {{ t('summary.sendEmail') }}
          </button>
        </div>
      </div>
    </div>

    <footer class="footer">
      <div class="footer__inner content-container">
        <p class="footer__copy">{{ t('app.footer') }}</p>
        <p class="footer__contacts">
          <a
            class="footer__link"
            :href="CONTACT_PHONE_HREF"
            :aria-label="t('contacts.phoneAria')"
          >{{ t('contacts.phoneDisplay') }}</a>
          <span class="footer__sep" aria-hidden="true"> · </span>
          <a
            class="footer__link"
            :href="CONTACT_EMAIL_HREF"
            :aria-label="t('contacts.emailAria')"
          >{{ t('contacts.emailDisplay') }}</a>
        </p>
        <p class="footer__privacy-wrap">
          <button type="button" class="footer__privacy" @click="privacyOpen = true">
            {{ t('privacy.link') }}
          </button>
        </p>
      </div>
    </footer>

    <a
      v-if="showWaFab"
      class="wa-fab"
      :href="CONTACT_WHATSAPP_HREF"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="t('fab.waAria')"
      title="WhatsApp"
    >
      <span aria-hidden="true" class="wa-fab__label">WhatsApp</span>
    </a>

    <div v-if="proActive" class="pro-indicator" aria-hidden="true">PRO</div>

    <OrderFormModal
      :open="formOpen"
      :type-id="selectedTypeId"
      @close="closeForm"
      @submit="onSubmit"
    />

    <PrivacyPolicyModal :open="privacyOpen" @close="privacyOpen = false" />
  </div>
</template>

<style scoped>
.content-container {
  width: 100%;
  max-width: 1400px;
  margin-inline: auto;
  padding-left: max(1.25rem, env(safe-area-inset-left));
  padding-right: max(1.25rem, env(safe-area-inset-right));
  box-sizing: border-box;
}

.app {
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.header {
  background:
    radial-gradient(900px 520px at 20% 20%, rgba(196, 163, 90, 0.12), transparent 60%),
    linear-gradient(135deg, var(--allexo-teal) 0%, #0b2f30 100%);
  color: #fff;
  padding: 0;
  position: relative;
  overflow: clip;
}

.header__inner {
  /* inherits container sizing via .content-container */
}

.hero {
  padding-top: 40px;
  padding-bottom: 40px;
  position: relative;
}

@media (max-width: 640px) {
  .header__row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
  }
}

@media (min-width: 640px) {
  .hero {
    padding-top: 48px;
    padding-bottom: 48px;
  }
}

@media (max-width: 430px) {
  .hero {
    padding-top: 28px;
    padding-bottom: 28px;
  }
}

.header__row {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem 1.5rem;
}

.hero-corner-contacts {
  position: absolute;
  right: 28px;
  bottom: 28px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  z-index: 1;
}

.hero-corner-contacts__link {
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-decoration: underline;
  text-underline-offset: 3px;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.hero-corner-contacts__link:hover {
  color: #fff;
}

@media (max-width: 640px) {
  .hero-corner-contacts {
    position: static;
    margin-top: 0.9rem;
    align-items: center;
    text-align: center;
  }
}


.main {
  flex: 1;
  padding-top: 1.25rem;
  padding-bottom: 2rem;
}

.app:has(.sticky-total) .main {
  padding-bottom: 6.25rem;
}

@media (min-width: 640px) {
  .main {
    padding: 1.5rem 1.25rem 2.5rem;
  }
}

.steps {
  margin: 0 0 1.25rem;
  padding: 0.85rem 1rem;
  list-style: none;
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.steps__item {
  margin: 0;
  padding: 0.2rem 0;
  font-size: 0.875rem;
  color: var(--allexo-text);
  line-height: 1.45;
}

.steps__item:not(:last-child) {
  border-bottom: 1px solid var(--allexo-border);
  padding-bottom: 0.45rem;
  margin-bottom: 0.45rem;
}

.steps__label {
  font-weight: 700;
  color: var(--allexo-teal);
  margin-right: 0.25rem;
}

.about {
  margin: 0 0 1.5rem;
  padding: 1rem 1rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, rgba(15, 61, 62, 0.04) 0%, rgba(15, 61, 62, 0.02) 100%);
  box-shadow: var(--shadow);
  max-width: none;
  position: relative;
}

@media (max-width: 430px) {
  .about {
    padding: 0.85rem 0.9rem;
  }
}

.about::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--allexo-teal);
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  opacity: 0.75;
}

.about__title {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--allexo-muted);
}

.about__line {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--allexo-teal);
  line-height: 1.35;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.about__line + .about__line {
  margin-top: 0.35rem;
}

.about__line--secondary {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.calc {
  margin-top: 1.25rem;
}

.social-proof {
  margin: 0 0 1.25rem;
}

.social-proof__card {
  padding: 0.9rem 1rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(15, 61, 62, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.85), rgba(245, 250, 249, 0.85));
  box-shadow: 0 12px 28px rgba(15, 61, 62, 0.08);
}

.social-proof__stars {
  margin: 0 0 0.25rem;
  font-size: 0.92rem;
  letter-spacing: 0.12em;
  color: var(--allexo-accent);
}

.social-proof__quote {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--allexo-text);
  line-height: 1.35;
  text-wrap: balance;
}

.social-proof__meta {
  margin: 0.3rem 0 0;
  font-size: 0.85rem;
  font-weight: 650;
  color: var(--allexo-muted);
}

.sticky-total {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 40;
  padding: 0.65rem max(1rem, env(safe-area-inset-left)) max(0.65rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-right));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--allexo-border);
}

.sticky-total__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.sticky-total__sum {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.sticky-total__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.sticky-total__btn {
  flex-shrink: 0;
  min-height: 2.75rem;
  padding: 0.55rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid var(--allexo-border);
  background: var(--allexo-teal);
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.sticky-total__btn--wa {
  padding-inline: 0.75rem;
}

.sticky-total__btn--ghost {
  background: transparent;
  color: var(--allexo-teal);
}

.sticky-total__btn--secondary {
  background: transparent;
  color: var(--allexo-teal);
}

.sticky-total__btn--ghost:hover {
  background: var(--allexo-bg);
  color: var(--allexo-teal);
}

.sticky-total__btn--secondary:hover {
  background: var(--allexo-bg);
  color: var(--allexo-teal);
}

.sticky-total__btn:hover {
  background: var(--allexo-teal-light);
}

@media (max-width: 430px) {
  .sticky-total__sum {
    font-size: 0.9rem;
  }

  .sticky-total__inner {
    align-items: flex-start;
  }
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.footer {
  padding: max(1rem, env(safe-area-inset-bottom)) 0;
  text-align: center;
  font-size: 0.8rem;
  color: var(--allexo-muted);
  border-top: 1px solid var(--allexo-border);
  background: var(--allexo-surface);
}

.footer__copy {
  margin: 0;
}

.footer__contacts {
  margin: 0.45rem 0 0;
  font-size: 0.86rem;
  line-height: 1.45;
}

.footer__link {
  display: inline-block;
  color: var(--allexo-teal);
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
  word-break: break-word;
  padding: 0.2rem 0;
  min-height: 2.75rem;
  line-height: 2.35rem;
}

.footer__link:hover {
  color: var(--allexo-teal-light);
}

.footer__sep {
  opacity: 0.55;
  padding: 0 0.15rem;
}

.footer__privacy-wrap {
  margin: 0.65rem 0 0;
}

.footer__privacy {
  margin: 0;
  padding: 0.35rem 0.25rem;
  min-height: 2.75rem;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--allexo-teal);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.footer__privacy:hover {
  color: var(--allexo-teal-light);
}

.wa-fab {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: calc(max(1rem, env(safe-area-inset-bottom)) + var(--sticky-offset, 0px));
  z-index: 80;
  width: auto;
  height: 3.15rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-weight: 950;
  letter-spacing: -0.03em;
  color: #0b2f30;
  border: 1px solid rgba(15, 61, 62, 0.14);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(245, 250, 249, 0.92));
  box-shadow: 0 18px 44px rgba(15, 61, 62, 0.18);
  backdrop-filter: blur(10px);
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.14s ease, box-shadow 0.2s ease;
  padding: 0 0.95rem;
}

.wa-fab:hover {
  transform: translateY(-1px);
  box-shadow: 0 22px 54px rgba(15, 61, 62, 0.22);
}

.wa-fab:active {
  transform: translateY(0);
}

.wa-fab__label {
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.app:has(.sticky-total) .wa-fab {
  --sticky-offset: 4.9rem;
}

.summary-flash {
  animation: summaryFlash 900ms ease-out;
}

@keyframes summaryFlash {
  0% {
    transform: translateY(0);
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }
  15% {
    transform: translateY(-2px);
  }
  40% {
    box-shadow: 0 0 0 6px rgba(196, 163, 90, 0.18);
  }
  100% {
    transform: translateY(0);
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }
}

.pro-indicator {
  position: fixed;
  left: max(0.85rem, env(safe-area-inset-left));
  bottom: max(0.85rem, env(safe-area-inset-bottom));
  z-index: 70;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(15, 61, 62, 0.18);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
  color: var(--allexo-teal);
  font-size: 0.72rem;
  font-weight: 950;
  letter-spacing: 0.08em;
}
</style>
