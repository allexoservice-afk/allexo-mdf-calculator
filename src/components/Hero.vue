<script setup>
import { computed, Teleport, ref } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { isProUnlocked, setProUnlocked, verifyProCode } from '../constants/proUnlock.js'
import { LOCALE_SWITCH_ORDER } from '../i18n/translations.js'

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
  <div class="header__text">
    <div class="hero-top">
      <button type="button" class="header__brand" @click="onBrandTap">
        ALLEXO
      </button>

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

    <h1 class="header__title">{{ t('hero.title') }}</h1>
    <p class="header__tag">{{ t('hero.subtitle') }}</p>
    <button type="button" class="header__cta" @click="scrollToCalculator">
      {{ t('app.calcCta') }}
    </button>
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
}

.hero-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.header__brand {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #c4a35a;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  text-shadow:
    0 0 24px rgba(196, 163, 90, 0.2),
    0 0 48px rgba(196, 163, 90, 0.08);
}

.lang {
  display: flex;
  align-items: center;
  justify-content: flex-end;
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
  margin: 0.55rem 0 0;
  font-size: 1.3rem;
  font-weight: 750;
  color: #ffffff;
  letter-spacing: -0.02em;
  line-height: 1.38;
  max-width: min(56.25rem, 100%);
  text-wrap: balance;
  overflow-wrap: break-word;
  hyphens: auto;
}

@media (max-width: 430px) {
  .hero-top {
    align-items: center;
  }

  .lang {
    gap: 0.15rem 0.05rem;
    font-size: 0.78rem;
    letter-spacing: 0.03em;
  }

  .lang__btn {
    min-width: 2.35rem;
    min-height: 2.35rem;
    padding: 0.25rem 0.35rem;
  }

  .lang__sep {
    display: none;
  }

  .header__title {
    font-size: 1.08rem;
    line-height: 1.32;
  }
}

@media (min-width: 640px) {
  .header__title {
    font-size: clamp(2.05rem, 2.65vw, 2.35rem);
    line-height: 1.34;
  }
}

.header__tag {
  margin: 8px 0 0;
  font-size: 1.05rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.85);
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

@media (max-width: 430px) {
  .header__cta {
    width: 100%;
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
