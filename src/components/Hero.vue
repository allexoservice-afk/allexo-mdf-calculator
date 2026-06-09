<script setup>
import { computed, Teleport, ref } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { isProUnlocked, setProUnlocked, verifyProCode } from '../constants/proUnlock.js'
import { LOCALE_SWITCH_ORDER } from '../i18n/translations.js'
import { CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF, CONTACT_WHATSAPP_HREF } from '../constants/contact.js'
import { trackMetaContact } from '../services/metaPixel.js'

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

function onWhatsAppClick() {
  trackMetaContact()
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
  <div class="header__text">
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

    <div class="hero-main">
      <div class="hero-top">
        <button type="button" class="header__brand" @click="onBrandTap" aria-label="ALLEXO">
          <img
            src="/allexo-header-logo-transparent.png"
            alt="ALLEXO"
            class="hero-logo"
            width="1067"
            height="500"
            decoding="async"
          />
        </button>
      </div>

      <h1 class="header__title">{{ t('hero.title') }}</h1>
      <p class="header__tag">{{ t('hero.subtitle') }}</p>
      <button type="button" class="header__cta" @click="scrollToCalculator">
        {{ t('app.calcCta') }}
      </button>
    </div>

    <div class="hero-contacts" role="region" :aria-label="t('contacts.title')">
      <a class="hero-contacts__link" :href="CONTACT_EMAIL_HREF" :aria-label="t('contacts.emailAria')">
        {{ t('contacts.emailDisplay') }}
      </a>
      <a class="hero-contacts__link" :href="CONTACT_PHONE_HREF" :aria-label="t('contacts.phoneAria')">
        {{ t('contacts.phoneDisplay') }}
      </a>
      <a
        class="hero-contacts__link hero-contacts__link--wa"
        :href="CONTACT_WHATSAPP_HREF"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('fab.waAria')"
        @click="onWhatsAppClick"
      >
        {{ t('getQuote.contactWhatsapp') }}
      </a>
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
.header__text {
  flex: 1;
  min-width: 0;
  position: relative;
}

.hero-main {
  display: contents;
}

.hero-top {
  display: grid;
  grid-template-columns: 1fr;
  align-items: start;
}

.header__brand {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  display: inline-flex;
  align-items: flex-start;
  grid-area: 1 / 1;
  justify-self: start;
  align-self: start;
  margin-top: -16px;
  margin-left: 35%;
  transform: translateX(-50%);
}

@media (min-width: 769px) {
  .header__text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .hero-top {
    display: block;
    width: 100%;
  }

  .header__brand {
    margin-top: 0;
    margin-left: 0;
    transform: none;
    justify-self: start;
    align-self: start;
    display: inline-flex;
  }

  .header__title {
    margin-top: 20px;
    max-width: 32rem;
  }

  .header__tag {
    max-width: 30rem;
  }

  .header__cta {
    align-self: flex-start;
    margin-top: 16px;
  }

  .hero-contacts {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }

  .hero-contacts__link {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.92rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    text-decoration: underline;
    text-decoration-color: #c4a35a;
    text-underline-offset: 4px;
    white-space: nowrap;
    transition:
      color 0.25s ease,
      text-decoration-color 0.25s ease;
  }

  .hero-contacts__link:hover {
    color: #fff;
    text-decoration-color: #c4a35a;
  }
}

@media (min-width: 1024px) {
  .header__text {
    width: 100%;
    display: block;
    box-sizing: border-box;
    position: relative;
    min-height: 360px;
  }

  .hero-main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 14px;
    padding: 40px 0 0 106px;
    box-sizing: border-box;
  }

  .hero-top {
    width: auto;
  }

  .header__brand {
    transform: none;
  }

  .header__title {
    margin-top: 0;
    max-width: 32rem;
  }

  .header__tag {
    margin-top: 0;
    max-width: 30rem;
  }

  .header__cta {
    margin-top: 0;
    width: auto;
    max-width: 360px;
    align-self: flex-start;
  }

  .lang {
    top: 40px;
    right: 50px;
  }

  .hero-contacts {
    position: absolute;
    right: 50px;
    bottom: 54px;
    margin-top: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
  }
}

.hero-logo {
  display: block;
  width: auto;
  height: 110px;
  object-fit: contain;
}

@media (max-width: 1024px) {
  .hero-logo {
    height: 95px;
  }
}

.lang {
  position: absolute;
  top: -28px;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem 0.15rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  z-index: 2;
}

@media (min-width: 769px) {
  .lang {
    top: 0;
    right: 0;
  }
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
  opacity: 0.52;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  transition: opacity 0.25s ease;
}

.lang__btn:hover {
  opacity: 0.78;
}

.lang__btn--active {
  opacity: 1;
  color: #c4a35a;
  text-decoration: none;
}

.lang__btn--active::after {
  content: '';
  position: absolute;
  left: 0.4rem;
  right: 0.4rem;
  bottom: 0.28rem;
  height: 1px;
  background: #c4a35a;
}

.lang__sep {
  opacity: 0.28;
  user-select: none;
  padding: 0 0.05rem;
}

.header__title {
  margin: 28px 0 0;
  font-size: 28px;
  font-weight: 750;
  background: linear-gradient(180deg, #ffffff 0%, #f2ead0 42%, #d4b87a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: -0.02em;
  line-height: 1.08;
  max-width: min(56.25rem, 100%);
  text-wrap: balance;
  overflow-wrap: break-word;
  hyphens: auto;
}

@media (max-width: 1024px) {
  .header__title {
    font-size: 24px;
  }
}

.hero-contacts__link {
  -webkit-tap-highlight-color: transparent;
}

@media (max-width: 768px) {
  .header__text {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .hero-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .hero-layout__visual {
    display: none;
  }

  .hero-layout__main {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .hero-contacts {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.05rem;
  }

  .hero-contacts__link {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.3;
    opacity: 0.9;
    color: rgba(255, 255, 255, 0.9);
    text-decoration: underline;
    text-decoration-color: #c4a35a;
    text-underline-offset: 3px;
  }

  .hero-top {
    display: block;
    width: 100%;
    margin-top: 1.25rem;
  }

  .header__brand {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-top: 0;
    margin-left: 0;
    transform: translateX(-10px);
    grid-area: unset;
  }

  .hero-logo {
    height: auto;
    max-height: 62px;
    max-width: 195px;
    width: auto;
    margin-top: 0;
  }

  .lang {
    position: absolute;
    top: 12px;
    right: 12px;
    left: auto;
    width: auto;
    max-width: 42%;
    z-index: 2;
    gap: 0;
    font-size: 12px;
    letter-spacing: 0.02em;
    justify-content: flex-end;
    flex-wrap: nowrap;
  }

  .lang__btn {
    min-width: 0;
    min-height: 1.5rem;
    padding: 0.1rem 0.18rem;
  }

  .lang__sep {
    display: inline;
    padding: 0 0.18rem;
    opacity: 0.32;
  }

  .header__title {
    margin-top: 10px;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.22;
    max-width: 88%;
    text-wrap: balance;
    overflow-wrap: break-word;
    hyphens: none;
  }

  .header__tag {
    margin-top: 4px;
    font-size: 14px;
    line-height: 1.35;
    opacity: 0.9;
    max-width: 88%;
  }

  .header__cta {
    width: 100%;
    max-width: 340px;
    height: 52px;
    min-height: 52px;
    margin-top: 8px;
    margin-inline: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 1.15rem;
  }
}

@media (max-width: 430px) {
  .header__title {
    font-size: 17px;
    max-width: 92%;
  }
}

.header__tag {
  margin: 8px 0 0;
  font-size: 1.05rem;
  line-height: 1.45;
  color: #ffffff;
  opacity: 1;
  max-width: 32rem;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.header__cta {
  margin: 14px 0 0;
  min-height: 3.15rem;
  padding: 0.78rem 1.25rem;
  border-radius: 999px;
  border: 1px solid #c4a35a;
  background: #111111;
  color: #fff;
  font: inherit;
  font-weight: 850;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
  -webkit-tap-highlight-color: transparent;
  transition:
    background 0.25s ease,
    color 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

.header__cta:hover {
  background: #c4a35a;
  border-color: #c4a35a;
  color: #000;
  box-shadow: 0 12px 32px rgba(196, 163, 90, 0.18);
}

.header__cta:active {
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.2);
}

.header__cta:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.9);
  outline-offset: 3px;
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
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
}

.unlock {
  position: relative;
  z-index: 1;
  width: min(92vw, 380px);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 54px rgba(0, 0, 0, 0.32);
  padding: 1rem;
}

.unlock__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.unlock__title {
  margin: 0;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--allexo-teal);
}

.unlock__close {
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 12px;
  background: rgba(17, 17, 17, 0.06);
  color: var(--allexo-text);
  font-size: 1.4rem;
  cursor: pointer;
}

.unlock__hint {
  margin: 0.45rem 0 0.75rem;
  color: var(--allexo-muted);
  font-size: 0.9rem;
  line-height: 1.35;
}

.unlock__input {
  width: 100%;
  min-height: 2.9rem;
  padding: 0.65rem 0.75rem;
  border-radius: 14px;
  border: 1px solid var(--allexo-border);
  background: #fff;
  font: inherit;
}

.unlock__input:focus {
  outline: none;
  border-color: var(--allexo-teal);
  box-shadow: 0 0 0 3px rgba(196, 163, 90, 0.25);
}

.unlock__err {
  margin: 0.5rem 0 0;
  color: var(--allexo-danger);
  font-size: 0.85rem;
  font-weight: 650;
}

.unlock__actions {
  margin-top: 0.9rem;
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
}

.unlock__btn {
  min-height: 2.7rem;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  border: 1px solid #111111;
  background: #111111;
  color: #fff;
  font: inherit;
  font-weight: 850;
  cursor: pointer;
  transition:
    background 0.18s,
    color 0.18s,
    border-color 0.18s;
}

.unlock__btn:hover {
  background: var(--allexo-accent);
  color: #111111;
  border-color: var(--allexo-accent);
}

.unlock__btn--ghost {
  background: transparent;
  color: var(--allexo-teal);
}

</style>
