<script setup>
import { computed, Teleport, ref } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { isProUnlocked, setProUnlocked, verifyProCode } from '../constants/proUnlock.js'
import { LOCALE_SWITCH_ORDER } from '../i18n/translations.js'
import { CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF, CONTACT_VAT } from '../constants/contact.js'

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
    <div class="site-container hero-body">
      <div class="hero-main">
        <div class="hero-head">
          <div class="hero-logotype">
            <h1 class="hero-brand-name">
              <button type="button" class="hero-brand-name__btn" @click="onBrandTap">ALLEXO</button>
            </h1>
            <p class="hero-brand-tag">{{ t('hero.brandTag') }}</p>
          </div>

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

        <div class="hero-body-grid">
          <div class="hero-stack">
            <div class="hero-cta-block">
              <button type="button" class="hero-cta" @click="scrollToCalculator">
                {{ t('app.calcCta') }}
              </button>
              <p class="hero-cta-note">{{ t('hero.ctaNote') }}</p>
            </div>
          </div>

          <div class="hero-contacts" role="region" :aria-label="t('contacts.title')">
            <div class="hero-contacts__links">
              <a
                class="hero-contacts__phone"
                :href="CONTACT_PHONE_HREF"
                :aria-label="t('contacts.phoneAria')"
              >
                <svg class="hero-contacts__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011-.24 11.1 11.1 0 003.47.56 1 1 0 011 1V21a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.1 11.1 0 00.56 3.47 1 1 0 01-.24 1l-2.2 2.32z"
                  />
                </svg>
                {{ t('contacts.phoneDisplay') }}
              </a>
              <span class="hero-contacts__sep" aria-hidden="true">·</span>
              <a
                class="hero-contacts__email"
                :href="CONTACT_EMAIL_HREF"
                :aria-label="t('contacts.emailAria')"
              >
                <svg class="hero-contacts__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                  />
                </svg>
                {{ t('contacts.emailDisplay') }}
              </a>
            </div>

            <span class="hero-contacts__btw" :aria-label="t('contacts.vatAria')">{{ CONTACT_VAT }}</span>
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
  /* ALLEXO — нейтральний антрацит (сірий, без зеленого/teal) */
  --hero-bg: #383a3a;
  --hero-bg-deep: #2c2e2e;
  --hero-gold: #e4b34c;
  --hero-text: #ffffff;
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-x: clip;
  color: var(--hero-text);
  background:
    radial-gradient(ellipse 48% 52% at 100% 0%, rgba(228, 179, 76, 0.1), transparent 50%),
    linear-gradient(180deg, #3e4040 0%, var(--hero-bg) 55%, var(--hero-bg-deep) 100%);
  border-bottom: 1px solid rgba(228, 179, 76, 0.2);
}

.hero-body {
  position: relative;
  z-index: 1;
  padding-block: 0.85rem 1.1rem;
}

.hero-main {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.hero-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem 1.25rem;
  width: 100%;
  min-width: 0;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.hero-body-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.85rem;
  width: 100%;
  min-width: 0;
}

.hero-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.55rem;
  min-width: 0;
}

.hero-logotype {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.22rem;
  min-width: 0;
}

.lang {
  display: flex;
  align-items: center;
  gap: 0.12rem;
  flex: 0 0 auto;
  margin-top: 0.12rem;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.05em;
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
  color: var(--hero-text);
}

.lang__btn--active {
  color: var(--hero-text);
}

.lang__btn--active::after {
  content: '';
  position: absolute;
  left: 0.05rem;
  right: 0.05rem;
  bottom: 0.05rem;
  height: 1.5px;
  background: var(--hero-gold);
}

.hero-brand-name {
  margin: 0;
  max-width: 100%;
  line-height: 1;
}

.hero-brand-name__btn {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: clamp(1.95rem, 5vw, 2.75rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--hero-gold);
  cursor: pointer;
  overflow-wrap: anywhere;
  -webkit-tap-highlight-color: transparent;
  animation: hero-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: opacity 0.22s ease;
}

.hero-brand-name__btn:hover {
  opacity: 0.9;
}

.hero-brand-name__btn:focus-visible {
  outline: 2px solid var(--hero-gold);
  outline-offset: 4px;
  border-radius: 2px;
}

.hero-brand-tag {
  margin: 0;
  max-width: 100%;
  font-size: clamp(0.68rem, 1.35vw, 0.76rem);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.68);
  animation: hero-rise 0.75s 0.05s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-cta-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.38rem;
  min-width: 0;
}

.hero-cta-note {
  margin: 0;
  max-width: min(18rem, 100%);
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.55);
  animation: hero-rise 0.75s 0.16s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 1 auto;
  min-width: 0;
  margin-top: 0;
  min-height: 2.5rem;
  padding: 0.5rem 1.45rem;
  border-radius: 999px;
  border: 1px solid var(--hero-gold);
  background: var(--hero-gold);
  color: #1a2220;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.015em;
  cursor: pointer;
  box-shadow:
    0 4px 14px rgba(228, 179, 76, 0.35),
    0 0 0 1px rgba(228, 179, 76, 0.15);
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
  background: #f0c05a;
  border-color: #f0c05a;
  color: #1a2220;
  box-shadow:
    0 6px 20px rgba(228, 179, 76, 0.45),
    0 0 0 1px rgba(240, 192, 90, 0.25);
  transform: translateY(-1px);
}

.hero-cta:focus-visible {
  outline: 2px solid var(--hero-gold);
  outline-offset: 3px;
}

.hero-contacts {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.32rem;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  text-align: right;
  margin: 0;
  animation: hero-rise 0.75s 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-contacts__links {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.32rem;
  min-width: 0;
  max-width: 100%;
}

.hero-contacts__sep {
  display: none;
}

.hero-contacts__icon {
  width: 0.9rem;
  height: 0.9rem;
  flex: 0 0 0.9rem;
  opacity: 0.88;
}

.hero-contacts__email,
.hero-contacts__phone {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  font-weight: 500;
  line-height: 1.35;
  text-decoration: none;
  max-width: 100%;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.hero-contacts__btw {
  margin-top: 0.08rem;
  font-size: 0.76rem;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.58);
  max-width: 100%;
}

.hero-contacts__email {
  font-size: 0.84rem;
  color: rgba(255, 255, 255, 0.84);
}

.hero-contacts__phone {
  color: var(--hero-gold);
  font-weight: 400;
  font-size: clamp(0.88rem, 2vw, 0.94rem);
  letter-spacing: 0.01em;
}

.hero-contacts__phone .hero-contacts__icon {
  width: 0.9rem;
  height: 0.9rem;
  flex: 0 0 0.9rem;
  opacity: 1;
}

.hero-contacts__email:hover,
.hero-contacts__phone:hover {
  opacity: 0.88;
}

.hero-contacts__email:visited {
  color: rgba(255, 255, 255, 0.84);
}

.hero-contacts__phone:visited {
  color: var(--hero-gold);
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
  .hero-brand-name__btn,
  .hero-brand-tag,
  .hero-cta-note,
  .hero-cta,
  .hero-contacts {
    animation: none;
  }

  .hero-cta:hover {
    transform: none;
  }
}

@media (min-width: 769px) {
  .hero-body {
    padding-block: 0.95rem 1.15rem;
  }

  .hero-head {
    padding-bottom: 0.65rem;
  }

  .hero-body-grid {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 0.75rem 2.25rem;
  }

  .hero-stack {
    gap: 0.6rem;
  }

  .hero-contacts {
    align-self: end;
    min-width: 12.5rem;
  }
}

@media (max-width: 768px) {
  .hero-body {
    padding-block: 0.42rem 0.42rem;
  }

  .hero-head {
    align-items: flex-start;
    padding-bottom: 0.28rem;
    gap: 0.55rem 0.75rem;
  }

  .hero-main {
    gap: 0.3rem;
  }

  .hero-logotype {
    gap: 0.1rem;
    flex: 1 1 auto;
    min-width: 0;
  }

  .hero-brand-name__btn {
    font-size: clamp(1.4rem, 7.2vw, 1.7rem);
    letter-spacing: 0.08em;
  }

  .hero-brand-tag {
    font-size: 0.56rem;
    letter-spacing: 0.15em;
  }

  .hero-body-grid {
    gap: 0.3rem;
  }

  .hero-stack {
    gap: 0.26rem;
  }

  .hero-cta-block {
    align-items: stretch;
    width: 100%;
    gap: 0.18rem;
  }

  .hero-cta {
    width: 100%;
    min-height: 2.2rem;
    padding: 0.38rem 1.05rem;
    font-size: 0.84rem;
  }

  .hero-cta-note {
    max-width: 100%;
    font-size: 0.6rem;
    line-height: 1.28;
    text-align: center;
    align-self: center;
  }

  .hero-contacts {
    align-items: flex-start;
    text-align: left;
    width: 100%;
    padding-top: 0.22rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    gap: 0.12rem;
  }

  .hero-contacts__links {
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    width: 100%;
  }

  .hero-contacts__sep {
    display: none;
  }

  .hero-contacts__email {
    order: 1;
    justify-content: flex-start;
    gap: 0.24rem;
    font-size: 0.74rem;
    color: rgba(255, 255, 255, 0.82);
  }

  .hero-contacts__phone {
    order: 2;
    justify-content: flex-end;
    gap: 0.24rem;
    font-size: 0.76rem;
    color: var(--hero-gold);
  }

  .hero-contacts__icon {
    width: 0.74rem;
    height: 0.74rem;
    flex: 0 0 0.74rem;
  }

  .hero-contacts__phone .hero-contacts__icon {
    width: 0.74rem;
    height: 0.74rem;
    flex: 0 0 0.74rem;
  }

  .hero-contacts__btw {
    margin-top: 0;
    align-self: center;
    text-align: center;
    width: 100%;
    font-size: 0.54rem;
    font-weight: 450;
    letter-spacing: 0.04em;
    color: rgba(255, 255, 255, 0.36);
  }

  .lang {
    font-size: 0.64rem;
    flex-shrink: 0;
    margin-top: 0;
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
