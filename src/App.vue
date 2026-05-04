<script setup>
import { ref } from 'vue'
import { CALCULATOR_TYPES } from './constants/calculatorTypes.js'
import { useOrder } from './composables/useOrder.js'
import { useLocale } from './i18n/useLocale.js'
import Hero from './components/Hero.vue'
import WorksGallery from './components/WorksGallery.vue'
import CalculatorCard from './components/CalculatorCard.vue'
import OrderFormModal from './components/OrderFormModal.vue'
import OrderSummary from './components/OrderSummary.vue'
import { CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF } from './constants/contact.js'
import { LOCALE_SWITCH_ORDER } from './i18n/translations.js'
import PrivacyPolicyModal from './components/PrivacyPolicyModal.vue'

const { lines, addLine, removeLine, clearOrder } = useOrder()
const { locale, setLocale, t } = useLocale()

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
  addLine(payload)
}

/** @param {import('./i18n/translations.js').Locale} code */
function pickLang(code) {
  setLocale(code)
}
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header__inner hero">
        <div class="header__row">
          <Hero />
          <nav class="lang" role="navigation" :aria-label="t('lang.switchAria')">
            <template v-for="(code, idx) in LOCALE_SWITCH_ORDER" :key="code">
              <span v-if="idx > 0" class="lang__sep" aria-hidden="true">|</span>
              <button
                type="button"
                class="lang__btn"
                :class="{ 'lang__btn--active': locale === code }"
                @click="pickLang(code)"
              >
                {{ t(`lang.${code}`) }}
              </button>
            </template>
          </nav>
        </div>
      </div>
    </header>

    <main class="main">
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

      <p class="intro">
        {{ t('app.intro') }}
      </p>

      <WorksGallery />

      <div class="grid">
        <CalculatorCard
          v-for="ty in CALCULATOR_TYPES"
          :key="ty.id"
          :type-id="ty.id"
          :visual="ty.visual"
          @select="openForm(ty.id)"
        />
      </div>

      <OrderSummary :lines="lines" @remove="removeLine" @clear="clearOrder" />
    </main>

    <footer class="footer">
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
    </footer>

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
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: linear-gradient(135deg, var(--allexo-teal) 0%, var(--allexo-teal-light) 100%);
  color: #fff;
  padding: 0 max(1rem, env(safe-area-inset-right)) 0 max(1rem, env(safe-area-inset-left));
}

.header__inner {
  max-width: 1100px;
  margin: 0 auto;
}

.hero {
  padding-top: 40px;
  padding-bottom: 40px;
}

@media (min-width: 640px) {
  .hero {
    padding-top: 48px;
    padding-bottom: 48px;
  }
}

.header__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem 1.5rem;
}

.lang {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.15rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.lang__btn {
  margin: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding: 0.35rem 0.45rem;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  opacity: 0.72;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}

.lang__btn:hover {
  opacity: 0.95;
}

.lang__btn--active {
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.lang__sep {
  opacity: 0.45;
  user-select: none;
  padding: 0 0.05rem;
}

.main {
  flex: 1;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  padding: 1.25rem max(1rem, env(safe-area-inset-left)) 2rem max(1rem, env(safe-area-inset-right));
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

.intro {
  margin: 0 0 1.25rem;
  color: var(--allexo-muted);
  font-size: 0.95rem;
  max-width: 40rem;
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
  padding: 1rem max(1rem, env(safe-area-inset-left)) max(1rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-right));
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
  font-size: 0.78rem;
  line-height: 1.45;
}

.footer__link {
  display: inline-block;
  color: var(--allexo-teal);
  text-decoration: none;
  word-break: break-word;
  padding: 0.2rem 0;
  min-height: 2.75rem;
  line-height: 2.35rem;
}

.footer__link:hover {
  text-decoration: underline;
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
</style>
