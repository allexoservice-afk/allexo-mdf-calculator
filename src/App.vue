<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MATERIAL_SWITCH_ORDER, normalizeMaterialId, typesForMaterial } from './constants/materialTypes.js'
import { useOrder } from './composables/useOrder.js'
import { useLocale } from './i18n/useLocale.js'
import Hero from './components/Hero.vue'
import WorksGallery from './components/WorksGallery.vue'
import AboutMe from './components/AboutMe.vue'
import CalculatorCard from './components/CalculatorCard.vue'
import OrderFormModal from './components/OrderFormModal.vue'
import OrderSummary from './components/OrderSummary.vue'
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF } from './constants/contact.js'
import PrivacyPolicyModal from './components/PrivacyPolicyModal.vue'
import { normalizeStoredWindow, normalizeWindowQuantity } from './constants/sizeCategories.js'
import {
  MIN_ORDER_EUR,
  discountEurosFor,
  mdfSubtotalEurosForOrderLines,
  payableWorkEurosForOrderLines,
} from './pricing/orderDiscount.js'
import { quoteLineWindowEuros } from './pricing/quoteLineWindow.js'
import { formatEuroExclVat } from './utils/priceDisplay.js'
import { isProUnlocked } from './constants/proUnlock.js'
import { useProManualDiscount } from './composables/useProManualDiscount.js'
import { PUBLISHED_REVIEWS } from './constants/publishedReviews.js'
import { trackMetaViewContent } from './services/metaPixel.js'

const { lines, addLine, updateLine, removeLine, clearOrder } = useOrder()
const { locale, t } = useLocale()

/** @param {(typeof PUBLISHED_REVIEWS)[number]} review */
function reviewQuoteText(review) {
  const loc = locale.value
  const txt = review.text
  return txt[loc] ?? txt.uk ?? ''
}

/** @type {import('vue').Ref<import('./constants/calculatorTypes.js').CalculatorTypeId | null>} */
const selectedTypeId = ref(null)
const formOpen = ref(false)
const editingLineKey = ref(/** @type {string | null} */ (null))

const editingLine = computed(() => {
  const key = editingLineKey.value
  if (!key) return null
  return lines.value.find((l) => l.key === key) ?? null
})
const privacyOpen = ref(false)
const quoteLeadOpen = ref(false)

/** @type {import('vue').Ref<import('./constants/materialTypes.js').MaterialId>} */
const selectedMaterial = ref('mdf')

const calculatorTypes = computed(() => typesForMaterial(selectedMaterial.value))

/** @param {import('./constants/materialTypes.js').MaterialId} material */
function pickMaterial(material) {
  selectedMaterial.value = normalizeMaterialId(material)
}

/** @param {import('./constants/calculatorTypes.js').CalculatorTypeId} id */
function openForm(id) {
  editingLineKey.value = null
  selectedTypeId.value = id
  trackMetaViewContent(id)
  formOpen.value = true
}

/** @param {string} key */
function openEditForm(key) {
  const line = lines.value.find((l) => l.key === key)
  if (!line) return
  editingLineKey.value = key
  selectedMaterial.value = normalizeMaterialId(line.materialId)
  selectedTypeId.value = line.typeId
  trackMetaViewContent(line.typeId)
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  selectedTypeId.value = null
  editingLineKey.value = null
}

/** @param {Parameters<typeof addLine>[0] & { editKey?: string }} payload */
function onSubmit(payload) {
  const { uiMode, uiIntent, editKey, ...rest } = /** @type {any} */ (payload)
  if (editKey) {
    updateLine(editKey, rest)
    scrollToSummary()
    flashSummary()
  } else {
    addLine(rest)
    if (uiMode === 'client' && uiIntent !== 'pickType') {
      scrollToSummary()
      flashSummary()
    }
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

function scrollToCalculator() {
  const el = document.getElementById('calculator')
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
  syncProActive()
  if (typeof window !== 'undefined') {
    window.addEventListener('allexo-pro-change', syncProActive)
    mobileMq = window.matchMedia('(max-width: 768px)')
    syncMobileLayout = () => {
      isMobileLayout.value = mobileMq?.matches ?? false
    }
    syncMobileLayout()
    mobileMq.addEventListener('change', syncMobileLayout)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('allexo-pro-change', syncProActive)
    if (mobileMq && syncMobileLayout) mobileMq.removeEventListener('change', syncMobileLayout)
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
    const total = formatEuroExclVat(payableOrderTotalEuros.value, locale.value)
    const minLine =
      mdfOrderSubtotalEuros.value > 0 && mdfOrderSubtotalEuros.value < MIN_ORDER_EUR
        ? `\n${t('form.minOrderHint').replace('{amount}', formatEuroExclVat(MIN_ORDER_EUR, locale.value))}`
        : ''
    body =
      `Доброго дня!\n\n` +
      `Хочу отримати прорахунок:\n` +
      `Сума: ${total}\n` +
      `Кількість позицій: ${count}\n` +
      `Тип робіт: ${types || '—'}\n\n` +
      `${minLine}\n\n` +
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
  return quoteLineWindowEuros(line, win)
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

const isMobileLayout = ref(false)
/** @type {MediaQueryList | null} */
let mobileMq = null
/** @type {(() => void) | null} */
let syncMobileLayout = null

const showStickyTotal = computed(
  () => !isMobileLayout.value && Array.isArray(lines.value) && lines.value.length > 0,
)

const showMobileStickyCart = computed(
  () => isMobileLayout.value && Array.isArray(lines.value) && lines.value.length > 0,
)

/** @param {Record<string, unknown>} line */
function lineSubtotalEuros(line) {
  return windowsForLine(line).reduce(
    (s, w) => s + windowPriceEuros(line, w) * normalizeWindowQuantity(w.quantity),
    0,
  )
}

const payableOrderTotalEuros = computed(() => {
  const base = payableWorkEurosForOrderLines(lines.value, lineSubtotalEuros)
  const disc = discountEurosFor(base, manualDiscountPct.value, proActive.value)
  return base - disc
})

const mdfOrderSubtotalEuros = computed(() =>
  mdfSubtotalEurosForOrderLines(lines.value, lineSubtotalEuros),
)
</script>

<template>
  <div class="app">
    <header class="header site-header">
      <Hero />
    </header>

    <main class="main site-container">
      <WorksGallery />

      <AboutMe />

      <section id="calculator" class="calc">
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

        <div
          class="material-switch"
          role="tablist"
          :aria-label="t('material.switchAria')"
        >
          <button
            v-for="code in MATERIAL_SWITCH_ORDER"
            :key="code"
            type="button"
            role="tab"
            class="material-switch__btn"
            :class="{ 'material-switch__btn--active': selectedMaterial === code }"
            :aria-selected="selectedMaterial === code"
            @click="pickMaterial(code)"
          >
            {{ t(`material.${code}`) }}
          </button>
          <span
            class="material-switch__slide"
            :class="{ 'material-switch__slide--pvc': selectedMaterial === 'pvc' }"
            aria-hidden="true"
          />
        </div>

        <div class="grid">
          <CalculatorCard
            v-for="ty in calculatorTypes"
            :key="ty.id"
            :type-id="ty.id"
            :material-id="selectedMaterial"
            :visual="ty.visual"
            @select="openForm(ty.id)"
          />
        </div>

        <div id="summary" :class="{ 'summary-flash': summaryFlash }">
          <OrderSummary
            v-model:quote-open="quoteLeadOpen"
            :lines="lines"
            @remove="removeLine"
            @edit="openEditForm"
            @clear="clearOrder"
            @add-another="scrollToCalculator"
          />
        </div>
      </section>

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
    </main>

    <div v-if="showStickyTotal" class="sticky-total" role="region" :aria-label="t('summary.stickyTotalAria')">
      <div class="sticky-total__inner site-container">
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
            {{ t('getQuote.submitQuote') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showMobileStickyCart"
      class="mobile-sticky-cart"
      role="region"
      :aria-label="t('summary.stickyTotalAria')"
    >
      <div class="mobile-sticky-cart__inner site-container">
        <p class="mobile-sticky-cart__sum">
          <template v-if="proActive">
            {{ t('summary.workSubtotal') }} {{ formatEuroExclVat(payableOrderTotalEuros, locale) }}
            <span class="mobile-sticky-cart__exvat">({{ t('price.exVat') }})</span>
          </template>
          <template v-else>
            {{ t('summary.stickyPublicLine') }}
          </template>
        </p>
        <button type="button" class="mobile-sticky-cart__btn" @click="scrollToSummary">
          <span class="mobile-sticky-cart__btn-label-full">{{ t('summary.title') }}</span>
          <span class="mobile-sticky-cart__btn-label-short">{{ t('summary.stickySummaryShort') }}</span>
        </button>
      </div>
    </div>

    <footer class="footer">
      <div class="footer__inner site-container">
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

    <OrderFormModal
      :open="formOpen"
      :type-id="selectedTypeId"
      :material-id="selectedMaterial"
      :initial-line="editingLine"
      @close="closeForm"
      @submit="onSubmit"
    />

    <PrivacyPolicyModal :open="privacyOpen" @close="privacyOpen = false" />
  </div>
</template>

<style scoped>
.site-header {
  width: 100%;
  max-width: 100%;
}

.app {
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-x: clip;
}

.header {
  background: var(--allexo-bg);
  color: var(--allexo-text);
  padding: 0;
  position: relative;
  overflow-x: clip;
  width: 100%;
  max-width: 100%;
  border-bottom: none;
  box-shadow: none;
}

.header::after {
  display: none;
}

@media (max-width: 768px) {
  .app {
    overflow-x: clip;
  }

  .reviews {
    margin: 0 0 var(--section-y);
  }

  .reviews__card {
    padding: var(--card-pad);
  }

  .reviews__list {
    margin-top: var(--space-3);
    gap: var(--space-3);
  }

  .reviews__item {
    padding: 0.7rem 0.85rem;
  }

  .reviews__item-quote {
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .reviews__item-meta {
    margin-top: 0.35rem;
    font-size: 0.78rem;
  }

  .steps {
    position: relative;
    z-index: auto;
    display: block;
    margin-top: 0;
    margin-bottom: var(--section-y);
    padding: 0.75rem 0.85rem;
  }

  .calc {
    position: relative;
    z-index: auto;
    padding-top: 0;
  }

  #summary {
    position: relative;
    z-index: auto;
  }

  .grid {
    gap: 0.85rem;
  }
}

@media (min-width: 769px) {
  .reviews {
    margin: 0 0 var(--section-y-lg);
  }

  .reviews__card {
    padding: var(--card-pad) 1.35rem;
    box-shadow: 0 10px 36px rgba(17, 17, 17, 0.07);
  }

  .reviews__title {
    font-size: 1.05rem;
  }

  .reviews__list {
    margin-top: 1rem;
    gap: 1rem;
  }

  .reviews__item {
    padding: 1.15rem 1.3rem;
  }

  .reviews__item-quote {
    line-height: 1.55;
    padding: 0 0.15rem;
  }
}

.main {
  flex: 1;
  /* Horizontal inset + max-width — лише з .site-container (не max-width: 100%) */
  padding-top: 0;
  padding-bottom: var(--space-10);
  min-width: 0;
  overflow-x: clip;
}

.app:has(.sticky-total) .main {
  padding-bottom: 7.5rem;
}

@media (max-width: 768px) {
  .app:has(.mobile-sticky-cart) .main {
    padding-bottom: calc(5.75rem + env(safe-area-inset-bottom, 0px));
  }

  .app:has(.mobile-sticky-cart) .footer {
    padding-bottom: calc(var(--section-y) + 5.25rem + env(safe-area-inset-bottom, 0px));
  }
}

@media (min-width: 769px) {
  .app:has(.sticky-total) .main {
    padding-bottom: 6.25rem;
  }

  .main {
    padding-top: 0;
    padding-bottom: var(--space-10);
  }
}

@media (min-width: 1024px) {
  .main {
    padding-top: 0;
  }
}

@media (max-width: 768px) {
  .main {
    padding-top: 0;
    padding-bottom: max(var(--space-8), env(safe-area-inset-bottom));
  }

  .app:has(.sticky-total) .main {
    padding-bottom: max(var(--space-8), env(safe-area-inset-bottom));
  }
}

.steps {
  margin: 0 0 var(--section-y);
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
  color: var(--allexo-green);
  margin-right: 0.25rem;
}

@media (min-width: 769px) {
  .steps {
    display: flex;
    align-items: stretch;
    margin-bottom: var(--section-y);
    padding: 0.45rem 0.55rem;
  }

  .steps__item {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: center;
    align-content: center;
    text-align: center;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0.35rem 0.7rem;
    line-height: 1.35;
    position: relative;
  }

  .steps__item:not(:last-child) {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .steps__item:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 22%;
    right: 0;
    bottom: 22%;
    width: 1px;
    background-color: var(--allexo-border);
    pointer-events: none;
  }
}

.calc {
  position: relative;
  margin-top: var(--section-y);
  padding-top: 0;
}

/* Mobile: менше повітря між WhatsApp (сервіс) і Stap 1 (розрахунок) */
@media (max-width: 768px) {
  .steps {
    position: relative;
    width: 100%;
    max-width: none;
    margin-top: 0;
    margin-inline: 0;
    margin-bottom: var(--section-y);
    box-sizing: border-box;
    /* без тіні — зовнішні краї як у карток About (інакше blur «вилазить») */
    box-shadow: none;
  }

  #calculator.calc {
    position: relative;
    width: 100%;
    max-width: none;
    margin-top: 20px; /* було 44px; −24px — два шляхи ближче */
    margin-inline: 0;
    padding-top: 0;
    box-sizing: border-box;
  }
}

.material-switch {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  max-width: 280px;
  margin: 0 auto var(--section-y);
  padding: 0.2rem;
  border: 1px solid var(--allexo-border);
  border-radius: 999px;
  background: var(--allexo-surface);
  box-shadow: var(--shadow);
}

.material-switch__btn {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--allexo-muted);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s;
}

.material-switch__btn--active {
  color: var(--allexo-green);
}

.material-switch__slide {
  position: absolute;
  top: 0.2rem;
  left: 0.2rem;
  width: calc(50% - 0.2rem);
  height: calc(100% - 0.4rem);
  border-radius: 999px;
  background: var(--allexo-green-soft);
  border: 1px solid rgba(17, 17, 17, 0.06);
  transition: transform 0.22s ease;
  pointer-events: none;
}

.material-switch__slide--pvc {
  transform: translateX(100%);
}

.reviews {
  margin: 0 0 var(--section-y-lg);
}

.reviews__card {
  padding: var(--card-pad);
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.reviews__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 850;
  color: var(--allexo-olive);
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
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
}

.sticky-total__sum {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--allexo-graphite);
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
  background: var(--allexo-btn);
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
  background: var(--allexo-btn-hover);
  color: #fff;
  border-color: var(--allexo-btn-hover);
}

.sticky-total__btn--ghost,
.sticky-total__btn--secondary {
  background: var(--allexo-surface);
  color: var(--allexo-text);
  border-color: var(--allexo-border);
}

.sticky-total__btn--ghost:hover,
.sticky-total__btn--secondary:hover {
  background: var(--allexo-bg);
  color: var(--allexo-green);
  border-color: var(--allexo-green);
}

.mobile-sticky-cart {
  display: none;
}

@media (max-width: 768px) {
  .mobile-sticky-cart {
    display: block;
    position: fixed;
    inset: auto 0 0 0;
    z-index: 45;
    width: 100%;
    max-width: 100%;
    padding: 0.55rem 0 max(0.55rem, env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
    pointer-events: none;
  }

  .mobile-sticky-cart__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    min-width: 0;
    padding-top: 0.6rem;
    padding-bottom: 0.6rem;
    border: 1px solid var(--allexo-border);
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-md);
    pointer-events: auto;
  }

  .mobile-sticky-cart__sum {
    margin: 0;
    flex: 1 1 auto;
    min-width: 0;
    font-size: clamp(0.78rem, 2.8vw, 0.92rem);
    font-weight: 700;
    line-height: 1.25;
    color: var(--allexo-graphite);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-sticky-cart__exvat {
    font-weight: 650;
    color: var(--allexo-muted);
  }

  .mobile-sticky-cart__btn {
    flex: 0 0 auto;
    max-width: 52%;
    min-height: 2.75rem;
    margin: 0;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--allexo-border);
    border-radius: var(--radius);
    background: var(--allexo-btn);
    color: #fff;
    font: inherit;
    font-size: clamp(0.78rem, 2.7vw, 0.88rem);
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition:
      background 0.18s,
      border-color 0.18s;
  }

  .mobile-sticky-cart__btn:hover {
    background: var(--allexo-btn-hover);
    border-color: var(--allexo-btn-hover);
  }

  .mobile-sticky-cart__btn-label-short {
    display: none;
  }
}

@media (max-width: 360px) {
  .mobile-sticky-cart__inner {
    gap: 0.4rem;
  }

  .mobile-sticky-cart__btn-label-full {
    display: none;
  }

  .mobile-sticky-cart__btn-label-short {
    display: inline;
  }
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
  gap: var(--space-4);
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
  padding: var(--section-y) 0 max(var(--section-y), env(safe-area-inset-bottom));
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
  color: var(--allexo-green);
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
  word-break: break-word;
  padding: 0.2rem 0;
  min-height: 2.75rem;
  line-height: 2.35rem;
}

.footer__link:hover {
  color: var(--allexo-btn-hover);
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
    box-shadow: 0 0 0 6px var(--allexo-focus-ring);
  }
  100% {
    transform: translateY(0);
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }
}

</style>
