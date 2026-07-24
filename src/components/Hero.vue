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
    <!-- Full-bleed dark bar; inner uses the same .site-container as main -->
    <div class="hero-topbar">
      <div class="site-container hero-topbar__inner">
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

    <div class="site-container hero-body">
      <div class="hero-main">
        <div class="hero-copy">
          <h1 class="hero-title">{{ t('hero.title') }}</h1>
          <p class="hero-calc-hook">{{ t('hero.calcHook') }}</p>
        </div>

        <div class="hero-actions">
          <div class="hero-cta-block">
            <button type="button" class="hero-cta" @click="scrollToCalculator">
              {{ t('app.calcCta') }}
            </button>
          </div>

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
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-x: clip;
  background:
    radial-gradient(ellipse 70% 80% at 92% 18%, rgba(197, 160, 89, 0.11), transparent 58%),
    linear-gradient(180deg, #f3f1ec 0%, var(--allexo-bg) 62%, var(--allexo-bg) 100%);
}

.hero-topbar {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  background: var(--allexo-hero);
  color: #fff;
}

/* Горизонталь лише з .site-container — тут тільки flex і вертикальний padding */
.hero-topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block: 0.88rem;
}

.hero-body {
  position: relative;
  z-index: 1;
  padding-top: 0.35rem;
  padding-bottom: calc(var(--section-y-lg) + 0.85rem);
}

.hero-brand {
  margin: 0;
  padding: 0.05rem 0 0.12rem;
  border: none;
  background: transparent;
  color: var(--allexo-gold);
  font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', Times, serif;
  font-size: 1.28rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1;
  text-transform: uppercase;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  transition: opacity 0.22s ease;
}

.hero-brand:hover {
  opacity: 0.88;
}

.hero-brand:focus-visible {
  outline: 2px solid var(--allexo-gold);
  outline-offset: 4px;
  border-radius: 2px;
}

.lang {
  display: flex;
  align-items: center;
  gap: 0.12rem;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  margin: 0;
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
  background: var(--allexo-gold);
}

.hero-main {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.35rem;
  margin-top: 2.55rem;
  padding-bottom: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
  max-width: min(38rem, 100%);
  width: 100%;
  min-width: 0;
}

.hero-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem 1.25rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.hero-cta-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.55rem;
  min-width: 0;
}

.hero-title {
  margin: 0;
  max-width: 100%;
  font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', Times, serif;
  font-size: clamp(1.85rem, 4.2vw, 2.65rem);
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: -0.02em;
  color: var(--allexo-olive);
  overflow-wrap: anywhere;
  animation: hero-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-calc-hook {
  margin: 0;
  max-width: 100%;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: clamp(0.86rem, 1.7vw, 0.98rem);
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: -0.005em;
  color: var(--allexo-muted);
  animation: hero-rise 0.75s 0.08s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 1 auto;
  min-width: 0;
  margin-top: 0;
  min-height: 2.55rem;
  padding: 0.5rem 1.45rem;
  border-radius: 999px;
  border: 1px solid var(--allexo-olive);
  background: var(--allexo-olive);
  color: #fff;
  font: inherit;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.12) inset, 0 8px 22px rgba(19, 52, 51, 0.14);
  -webkit-tap-highlight-color: transparent;
  transition:
    background 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease,
    color 0.22s ease;
  animation: hero-rise 0.75s 0.14s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-cta:hover {
  background: #1a4241;
  border-color: #1a4241;
  color: #fff;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.14) inset, 0 10px 26px rgba(19, 52, 51, 0.18);
  transform: translateY(-1px);
}

.hero-cta:focus-visible {
  outline: 2px solid var(--allexo-gold);
  outline-offset: 3px;
}

.hero-contacts {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  flex: 0 1 auto;
  min-width: 0;
  text-align: right;
  margin: 0;
  animation: hero-rise 0.75s 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-contacts__email,
.hero-contacts__phone {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 0.86rem;
  font-weight: 500;
  line-height: 1.35;
  text-decoration: none;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.hero-contacts__email {
  color: var(--allexo-muted);
}

.hero-contacts__phone {
  color: var(--allexo-gold);
  font-weight: 650;
  letter-spacing: 0.01em;
}

.hero-contacts__email:hover,
.hero-contacts__phone:hover {
  opacity: 0.78;
}

.hero-contacts__email:visited {
  color: var(--allexo-muted);
}

.hero-contacts__phone:visited {
  color: var(--allexo-gold);
}

@keyframes hero-rise {
  from {
    opacity: 0;
    transform: translateY(0.7rem);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-title,
  .hero-calc-hook,
  .hero-cta,
  .hero-contacts {
    animation: none;
  }

  .hero-cta:hover {
    transform: none;
  }
}

@media (min-width: 769px) {
  .hero-main {
    margin-top: 3rem;
    gap: 1.55rem;
  }

  .hero-actions {
    gap: 1.75rem;
  }

  .hero-copy {
    gap: 0.75rem;
  }
}

@media (max-width: 640px) {
  .hero-topbar__inner {
    padding-block: 0.68rem;
  }

  .hero-brand {
    font-size: 1.12rem;
    letter-spacing: 0.18em;
  }

  .hero-main {
    margin-top: 2rem;
    gap: 1.15rem;
  }

  .hero-copy {
    gap: 0.55rem;
  }

  .hero-title {
    font-size: clamp(1.55rem, 7vw, 1.95rem);
  }

  .hero-actions {
    gap: 0.65rem;
    align-items: flex-start;
  }

  .hero-cta {
    min-height: 2.35rem;
    padding: 0.42rem 1.15rem;
    font-size: 0.84rem;
  }

  .hero-contacts__email,
  .hero-contacts__phone {
    font-size: 0.74rem;
  }

  .lang {
    font-size: 0.68rem;
    flex-shrink: 1;
    min-width: 0;
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
