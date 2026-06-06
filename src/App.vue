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
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF } from './constants/contact.js'
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
import { useProManualDiscount } from './composables/useProManualDiscount.js'
import {
  MIN_ORDER_EUR,
  discountEurosFor,
  payableWorkEurosFor,
} from './pricing/orderDiscount.js'
import { PUBLISHED_REVIEWS } from './constants/publishedReviews.js'

const { lines, addLine, removeLine, clearOrder } = useOrder()
const { locale, t } = useLocale()

/** Варіант 1 (logo) = themes/variant-1-logo.css · Варіант 0 (teal) = main.css */
const THEME_STORAGE_KEY = 'allexo-theme-preview'
/** @type {import('vue').Ref<'logo' | 'teal'>} */
const colorTheme = ref('logo')

function applyColorTheme(name) {
  colorTheme.value = name
  if (name === 'teal') {
    document.documentElement.dataset.theme = 'teal'
  } else {
    delete document.documentElement.dataset.theme
  }
  try {
    sessionStorage.setItem(THEME_STORAGE_KEY, name)
  } catch {
    /* ignore */
  }
}

function toggleColorTheme() {
  applyColorTheme(colorTheme.value === 'logo' ? 'teal' : 'logo')
}

/** @param {(typeof PUBLISHED_REVIEWS)[number]} review */
function reviewQuoteText(review) {
  const loc = locale.value
  const txt = review.text
  return txt[loc] ?? txt.uk ?? ''
}

/** @type {import('vue').Ref<import('./constants/calculatorTypes.js').CalculatorTypeId | null>} */
const selectedTypeId = ref(null)
const formOpen = ref(false)
const privacyOpen = ref(false)
const quoteLeadOpen = ref(false)

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
  const { uiMode, uiIntent, ...rest } = /** @type {any} */ (payload)
  addLine(rest)
  if (uiMode === 'client' && uiIntent !== 'pickType') {
    scrollToSummary()
    flashSummary()
  }
}

function openQuoteLeadModal() {
  if (!Array.isArray(lines.value) || lines.value.length === 0) return
  quoteLeadOpen.value = true
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

const proActive = ref(false)
const { manualDiscountPct } = useProManualDiscount()
function syncProActive() {
  proActive.value = isProUnlocked()
}

onMounted(() => {
  let savedTheme = 'logo'
  try {
    const stored = sessionStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'teal' || stored === 'logo') savedTheme = stored
  } catch {
    /* ignore */
  }
  applyColorTheme(savedTheme)
  syncProActive()
  if (typeof window !== 'undefined') {
    window.addEventListener('allexo-pro-change', syncProActive)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('allexo-pro-change', syncProActive)
  }
  if (_flashTimer != null) window.clearTimeout(_flashTimer)
  _flashTimer = null
})

function openEmailFromSticky() {
  const count = Array.isArray(lines.value) ? lines.value.length : 0
  const types = Array.from(
    new Set(
      (lines.value ?? [])
        .map((l) => String(l?.typeId ?? ''))
        .filter(Boolean)
        .map((id) => t(`types.${id}.title`)),
    ),
  ).join(', ')

  const subject = t('lead.mailSubject')

  let body
  if (proActive.value) {
    const totalRaw = orderTotalEuros.value
    const total = formatEuroExclVat(payableOrderTotalEuros.value, locale.value)
    const minLine =
      totalRaw > 0 && totalRaw < MIN_ORDER_EUR
        ? `\nМінімальне замовлення: ${formatEuroExclVat(MIN_ORDER_EUR, locale.value)} (без ПДВ)\nДо мінімального: ${formatEuroExclVat(minOrderDiffEuros.value, locale.value)}`
        : ''
    body =
      `Доброго дня!\n\n` +
      `Хочу отримати прорахунок:\n` +
      `Сума: ${total}\n` +
      `Кількість позицій: ${count}\n` +
      `Тип робіт: ${types || '—'}\n\n` +
      `${minLine}\n\n` +
      `Знижки: 3% від 1000€, 5% від 1500€, 7% від 2000€, 10% від 3000€.\n\n` +
      `Можете уточнити деталі?`
  } else {
    body = t('lead.requestNoPriceBody')
      .replace('{count}', String(count))
      .replace('{types}', types || '—')
  }

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

const payableOrderTotalEuros = computed(() => {
  const raw = orderTotalEuros.value
  if (!(raw > 0)) return 0
  const base = payableWorkEurosFor(raw)
  const disc = discountEurosFor(base, manualDiscountPct.value, proActive.value)
  return base - disc
})
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

      <section class="reviews" :aria-label="t('reviews.aria')">
        <div class="reviews__card">
          <h2 class="reviews__title">{{ t('reviews.title') }}</h2>
          <ul v-if="PUBLISHED_REVIEWS.length" class="reviews__list" role="list">
            <li v-for="rev in PUBLISHED_REVIEWS" :key="rev.id" class="reviews__item">
              <p class="reviews__item-stars" aria-hidden="true">★★★★★</p>
              <blockquote class="reviews__item-quote">
                {{ reviewQuoteText(rev) }}
              </blockquote>
              <p class="reviews__item-meta">{{ rev.author }} · {{ rev.location }}</p>
            </li>
          </ul>
        </div>
      </section>

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
          <OrderSummary
            v-model:quote-open="quoteLeadOpen"
            :lines="lines"
            @remove="removeLine"
            @clear="clearOrder"
          />
        </div>
      </section>
    </main>

    <div v-if="showStickyTotal" class="sticky-total" role="region" :aria-label="t('summary.stickyTotalAria')">
      <div class="sticky-total__inner content-container">
        <p class="sticky-total__sum">
          <template v-if="proActive">
            {{ t('summary.workSubtotal') }} {{ formatEuroExclVat(payableOrderTotalEuros, locale) }}
            <span class="sticky-total__exvat">({{ t('price.exVat') }})</span>
          </template>
          <template v-else>
            {{ t('summary.stickyPublicLine') }}
          </template>
        </p>
        <div class="sticky-total__actions">
          <template v-if="proActive">
            <button type="button" class="sticky-total__btn sticky-total__btn--ghost" @click="scrollToSummary">
              <span class="sticky-total__label-full">{{ t('summary.title') }}</span>
              <span class="sticky-total__label-short">{{ t('summary.stickySummaryShort') }}</span>
            </button>
            <button
              type="button"
              class="sticky-total__btn sticky-total__btn--secondary"
              @click="openEmailFromSticky"
            >
              <span class="sticky-total__label-full">{{ t('summary.sendEmail') }}</span>
              <span class="sticky-total__label-short">{{ t('summary.stickyEmailShort') }}</span>
            </button>
          </template>
          <button
            v-else
            type="button"
            class="sticky-total__btn sticky-total__btn--primary"
            @click="openQuoteLeadModal"
          >
            {{ t('getQuote.title') }}
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

    <div v-if="proActive" class="pro-indicator" aria-hidden="true">PRO</div>

    <button
      type="button"
      class="theme-preview-toggle"
      :aria-pressed="colorTheme === 'logo'"
      @click="toggleColorTheme"
    >
      {{ colorTheme === 'logo' ? '↩ Teal (оригінал)' : '◆ Чорний + золото' }}
    </button>

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

.theme-preview-toggle {
  position: fixed;
  left: max(0.75rem, env(safe-area-inset-left));
  bottom: max(0.75rem, env(safe-area-inset-bottom));
  z-index: 60;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--allexo-border);
  background: var(--allexo-surface);
  color: var(--allexo-text);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.theme-preview-toggle:hover {
  border-color: var(--allexo-accent);
  color: var(--allexo-teal);
}

.header {
  background:
    radial-gradient(380px 240px at 6% 22%, rgba(196, 163, 90, 0.11), transparent 72%),
    radial-gradient(720px 420px at 14% 8%, rgba(196, 163, 90, 0.07), transparent 62%),
    linear-gradient(180deg, #111111 0%, #0a0a0a 100%);
  color: #fff;
  padding: 0;
  position: relative;
  overflow: clip;
}

.header::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: #c4a35a;
  opacity: 0.25;
  pointer-events: none;
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
  font-size: 0.96rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.35);
  text-underline-offset: 4px;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
  transition:
    color 0.25s ease,
    text-decoration-color 0.25s ease;
}

.hero-corner-contacts__link:hover {
  color: #fff;
  text-decoration-color: #c4a35a;
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
  color: var(--allexo-accent);
  margin-right: 0.25rem;
}

.about {
  margin: 0 0 1.5rem;
  padding: 1rem 1rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  background: var(--allexo-surface);
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
  background: var(--allexo-accent);
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  opacity: 1;
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

.reviews {
  margin: 0.5rem 0 1.35rem;
}

.reviews__card {
  padding: 1rem 1rem;
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.reviews__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 850;
  color: var(--allexo-teal);
}

.reviews__list {
  list-style: none;
  margin: 0.85rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.reviews__item {
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  background: var(--allexo-surface);
}

.reviews__item-stars {
  margin: 0 0 0.25rem;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  color: var(--allexo-accent);
}

.reviews__item-quote {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 650;
  color: var(--allexo-text);
  line-height: 1.45;
  text-wrap: balance;
}

.reviews__item-meta {
  margin: 0.45rem 0 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.sticky-total {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 40;
  padding: 0.65rem 0 max(0.65rem, env(safe-area-inset-bottom)) 0;
  background: transparent;
  border-top: none;
}

.sticky-total__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
  border: 1px solid var(--allexo-border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
}

.sticky-total__sum {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.sticky-total__exvat {
  display: none;
  margin-left: 0.35rem;
  font-weight: 650;
  color: var(--allexo-muted);
}

.sticky-total__label-short {
  display: none;
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
  background: #111111;
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background 0.18s,
    color 0.18s,
    border-color 0.18s;
}

.sticky-total__btn--primary {
  padding-inline: 1rem;
  white-space: nowrap;
}

.sticky-total__btn--primary:hover {
  background: var(--allexo-accent);
  color: #111111;
  border-color: var(--allexo-accent);
}

.sticky-total__btn--ghost,
.sticky-total__btn--secondary {
  background: var(--allexo-surface);
  color: var(--allexo-text);
  border-color: var(--allexo-accent);
}

.sticky-total__btn--ghost:hover,
.sticky-total__btn--secondary:hover {
  background: var(--allexo-surface);
  color: var(--allexo-accent);
  border-color: var(--allexo-accent);
}

@media (max-width: 430px) {
  .sticky-total__sum {
    font-size: 0.9rem;
  }

  .sticky-total__inner {
    align-items: flex-start;
  }
}

@media (max-width: 639px) {
  .sticky-total__inner {
    flex-direction: column;
    align-items: stretch;
    gap: 0.45rem;
  }

  .sticky-total__sum {
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.95rem;
  }

  .sticky-total__exvat {
    display: inline;
  }

  .sticky-total__actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.45rem;
    justify-content: stretch;
  }

  .sticky-total__btn {
    width: 100%;
    min-height: 2.55rem;
    padding: 0.45rem 0.6rem;
    font-size: 0.85rem;
    border-radius: 10px;
  }

  .sticky-total__label-full {
    display: none;
  }

  .sticky-total__label-short {
    display: inline;
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
  border: 1px solid var(--allexo-border);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
  color: var(--allexo-teal);
  font-size: 0.72rem;
  font-weight: 950;
  letter-spacing: 0.08em;
}
</style>
