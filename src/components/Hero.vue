<script setup>
import { computed, Teleport, ref } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { isProUnlocked, setProUnlocked, verifyProCode } from '../constants/proUnlock.js'
import { LOCALE_SWITCH_ORDER } from '../i18n/translations.js'
import { CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF } from '../constants/contact.js'

const { locale, setLocale, t } = useLocale()

const unlockOpen = ref(false)
const unlockCode = ref('')
const unlockErr = ref('')
const isProNow = computed(() => isProUnlocked())
let tapCount = 0
let tapTimer = /** @type {number | null} */ (null)

function scrollToCalculator() {
  const el = document.getElementById('calculator')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** @param {import('../i18n/translations.js').Locale} code */
function pickLang(code) {
  setLocale(code)
}

function onBrandTap() {
  tapCount += 1
  if (tapTimer != null) window.clearTimeout(tapTimer)
  tapTimer = window.setTimeout(() => {
    tapCount = 0
    tapTimer = null
  }, 1400)
  if (tapCount >= 2) {
    tapCount = 0
    if (tapTimer != null) window.clearTimeout(tapTimer)
    tapTimer = null
    openUnlock()
  }
}

function openUnlock() {
  unlockErr.value = ''
  unlockCode.value = ''
  unlockOpen.value = true
}

async function submitUnlock() {
  unlockErr.value = ''
  const ok = await verifyProCode(unlockCode.value)
  if (!ok) {
    unlockErr.value = t('pro.err')
    return
  }
  setProUnlocked(!isProUnlocked())
  unlockOpen.value = false
}
</script>

<template>
  <div class="hero-shell">
    <div class="hero-topbar">
      <div class="hero-topbar__inner page-rail">
        <button type="button" class="hero-brand" @click="onBrandTap" aria-label="ALLEXO">
          ALLEXO
        </button>
        <nav class="lang" role="navigation" :aria-label="t('lang.switchAria')">
          <template v-for="(code, i) in LOCALE_SWITCH_ORDER" :key="code">
            <span v-if="i > 0" class="lang__sep" aria-hidden="true">|</span>
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

    <div class="hero-body page-rail">
      <div class="hero-main">
        <div class="hero-copy">
          <h1 class="hero-title">{{ t('hero.title') }}</h1>
          <p class="hero-benefits">{{ t('hero.subtitle') }}</p>
        </div>

        <div class="hero-actions">
          <button type="button" class="hero-cta" @click="scrollToCalculator">
            {{ t('app.calcCta') }}
          </button>

          <div class="hero-contacts" role="region" :aria-label="t('contacts.title')">
            <a
              class="hero-contacts__email"
              :href="CONTACT_EMAIL_HREF"
              :aria-label="t('contacts.emailAria')"
            >
              {{ t('contacts.emailDisplay') }}
            </a>
            <a
              class="hero-contacts__phone"
              :href="CONTACT_PHONE_HREF"
              :aria-label="t('contacts.phoneAria')"
            >
              {{ t('contacts.phoneDisplay') }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="unlockOpen"
      class="unlock-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="isProNow ? t('pro.lockTitle') : t('pro.unlockTitle')"
    >
      <div class="unlock" @click.stop>
        <div class="unlock__head">
          <p class="unlock__title">{{ isProNow ? t('pro.lockTitle') : t('pro.unlockTitle') }}</p>
          <button type="button" class="unlock__close" :aria-label="t('common.close')" @click="unlockOpen = false">
            ×
          </button>
        </div>
        <p class="unlock__hint">{{ isProNow ? t('pro.lockHint') : t('pro.unlockHint') }}</p>
        <input
          v-model="unlockCode"
          class="unlock__input"
          type="password"
          autocomplete="one-time-code"
          :placeholder="t('pro.placeholder')"
          @keydown.enter.prevent="submitUnlock"
        />
        <p v-if="unlockErr" class="unlock__err" role="status">{{ unlockErr }}</p>
        <div class="unlock__actions">
          <button type="button" class="unlock__btn unlock__btn--ghost" @click="unlockOpen = false">
            {{ t('pro.cancel') }}
          </button>
          <button type="button" class="unlock__btn" @click="submitUnlock">
            {{ isProNow ? t('pro.lock') : t('pro.unlock') }}
          </button>
        </div>
      </div>
      <div class="unlock-backdrop__bg" @click="unlockOpen = false" />
    </div>
  </Teleport>
</template>

<style scoped>
.hero-shell {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-x: clip;
}

.hero-topbar {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  background: var(--allexo-hero);
  color: #fff;
}

.hero-topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.7rem;
  padding-bottom: 0.7rem;
}

.hero-body {
  padding-top: 0;
  padding-bottom: calc(var(--section-y-lg) + 1.35rem);
}

.hero-brand {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #fff;
  font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', Times, serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.lang {
  display: flex;
  align-items: center;
  gap: 0.12rem;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  margin-right: -0.12rem;
}

.lang__sep {
  color: rgba(255, 255, 255, 0.35);
  user-select: none;
  padding: 0 0.18rem;
  font-weight: 400;
}

.lang__btn {
  margin: 0;
  min-height: 1.5rem;
  padding: 0.08rem 0.12rem;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  font: inherit;
  position: relative;
}

.lang__btn:last-child {
  padding-right: 0;
}

.lang__btn:hover {
  color: #fff;
}

.lang__btn--active {
  color: #fff;
}

.lang__btn--active::after {
  content: '';
  position: absolute;
  left: 0.05rem;
  right: 0.05rem;
  bottom: 0.05rem;
  height: 1.5px;
  background: #fff;
}

.hero-main {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
  margin-top: 2.35rem;
  padding-bottom: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  max-width: min(34rem, 100%);
  width: 100%;
  min-width: 0;
}

.hero-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 0.85rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.hero-title {
  margin: 0;
  max-width: 100%;
  font-family: Georgia, 'Times New Roman', Times, serif;
  font-size: clamp(1.55rem, 3.2vw, 2rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: var(--allexo-hero);
  overflow-wrap: anywhere;
}

.hero-benefits {
  margin: 0;
  max-width: 100%;
  min-width: 0;
  font-size: clamp(0.58rem, 2.15vw, 0.86rem);
  line-height: 1.35;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--allexo-muted);
  white-space: nowrap;
  overflow-x: clip;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 1 auto;
  min-width: 0;
  margin-top: 0;
  min-height: 2.35rem;
  padding: 0.4rem 1.2rem;
  border-radius: 999px;
  border: 1px solid #c4a56e;
  background: #c4a56e;
  color: #fff;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 650;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(196, 165, 110, 0.22);
  -webkit-tap-highlight-color: transparent;
  transition:
    background var(--ease),
    border-color var(--ease),
    box-shadow var(--ease),
    color var(--ease);
}

.hero-cta:hover {
  background: #b8975c;
  border-color: #b8975c;
  color: #fff;
  box-shadow: 0 3px 12px rgba(184, 151, 92, 0.28);
}

.hero-cta:focus-visible {
  outline: 2px solid #c4a56e;
  outline-offset: 3px;
}

.hero-contacts {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  flex: 0 1 auto;
  min-width: 0;
  text-align: right;
  margin: 0;
}

.hero-contacts__email,
.hero-contacts__phone {
  font-size: 0.84rem;
  font-weight: 500;
  line-height: 1.35;
  text-decoration: none;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity var(--ease);
}

.hero-contacts__email {
  color: var(--allexo-muted);
}

.hero-contacts__phone {
  color: var(--allexo-gold);
  font-weight: 700;
}

.hero-contacts__email:hover,
.hero-contacts__phone:hover {
  opacity: 0.8;
}

.hero-contacts__email:visited {
  color: var(--allexo-muted);
}

.hero-contacts__phone:visited {
  color: var(--allexo-gold);
}

@media (min-width: 769px) {
  .hero-main {
    margin-top: 2.65rem;
    gap: 0.95rem;
  }

  .hero-actions {
    gap: 1.5rem;
  }
}

@media (max-width: 640px) {
  .hero-topbar__inner {
    padding-top: 0.65rem;
    padding-bottom: 0.65rem;
  }

  .hero-brand {
    font-size: 0.94rem;
    letter-spacing: 0.12em;
  }

  .hero-main {
    margin-top: 1.95rem;
    gap: 0.85rem;
  }

  .hero-copy {
    gap: 0.7rem;
  }

  .hero-title {
    font-size: clamp(1.4rem, 6.5vw, 1.7rem);
  }

  .hero-actions {
    gap: 0.5rem;
    align-items: center;
  }

  .hero-cta {
    min-height: 2.2rem;
    padding: 0.34rem 0.95rem;
    font-size: 0.8rem;
  }

  .hero-contacts__email,
  .hero-contacts__phone {
    font-size: 0.7rem;
  }

  .hero-benefits {
    font-size: clamp(0.55rem, 2.8vw, 0.78rem);
  }

  .lang {
    font-size: 0.68rem;
    flex-shrink: 1;
    min-width: 0;
  }
}

@media (max-width: 360px) {
  .hero-benefits {
    white-space: normal;
    overflow-x: visible;
  }
}

.unlock-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.unlock-backdrop__bg {
  position: absolute;
  inset: 0;
  background: rgba(20, 22, 23, 0.55);
}

.unlock {
  position: relative;
  z-index: 1;
  width: min(100%, 22rem);
  padding: 1.15rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  background: var(--allexo-surface);
  box-shadow: var(--shadow-md);
}

.unlock__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.unlock__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--allexo-olive);
}

.unlock__close {
  border: none;
  background: var(--allexo-bg-alt);
  color: var(--allexo-text);
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 8px;
  font-size: 1.25rem;
  cursor: pointer;
}

.unlock__hint {
  margin: 0.65rem 0 0.85rem;
  font-size: 0.86rem;
  color: var(--allexo-muted);
}

.unlock__input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.7rem 0.8rem;
  border-radius: var(--radius);
  border: 1px solid var(--allexo-border);
  background: #fff;
  color: var(--allexo-text);
  font: inherit;
}

.unlock__input:focus {
  outline: none;
  border-color: var(--allexo-olive);
  box-shadow: 0 0 0 3px var(--allexo-focus-ring);
}

.unlock__err {
  margin: 0.45rem 0 0;
  font-size: 0.84rem;
  color: var(--allexo-danger);
}

.unlock__actions {
  display: flex;
  gap: 0.55rem;
  margin-top: 0.95rem;
}

.unlock__btn {
  flex: 1;
  min-height: 2.6rem;
  border-radius: var(--radius-btn);
  border: 1px solid var(--allexo-olive);
  background: var(--allexo-olive);
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.unlock__btn:hover {
  background: var(--allexo-btn-hover);
  border-color: var(--allexo-btn-hover);
}

.unlock__btn--ghost {
  background: transparent;
  color: var(--allexo-olive);
}

.unlock__btn--ghost:hover {
  background: var(--allexo-bg-alt);
  color: var(--allexo-olive);
}
</style>
