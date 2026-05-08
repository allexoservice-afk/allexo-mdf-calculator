<script setup>
import { Teleport, ref } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { isProUnlocked, setProUnlocked, verifyProCode } from '../constants/proUnlock.js'

const { t } = useLocale()

const unlockOpen = ref(false)
const unlockCode = ref('')
const unlockErr = ref('')
let tapCount = 0
let tapTimer = /** @type {number | null} */ (null)

function scrollToCalculator() {
  const el = document.getElementById('calculator')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onBrandTap() {
  if (isProUnlocked()) return
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
    unlockErr.value = ''
    unlockCode.value = ''
    unlockOpen.value = true
  }
}

function openUnlock() {
  if (isProUnlocked()) return
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
  setProUnlocked(true)
  unlockOpen.value = false
}
</script>

<template>
  <div class="header__text">
    <button type="button" class="header__brand" @click="onBrandTap" @dblclick.prevent="openUnlock">
      ALLEXO
    </button>
    <h1 class="header__title">{{ t('hero.title') }}</h1>
    <p class="header__tag">{{ t('hero.subtitle') }}</p>
    <button type="button" class="header__cta" @click="scrollToCalculator">
      {{ t('app.calcCta') }}
    </button>
  </div>

  <Teleport to="body">
    <div v-if="unlockOpen" class="unlock-backdrop" role="dialog" aria-modal="true" :aria-label="t('pro.unlockTitle')">
      <div class="unlock" @click.stop>
        <div class="unlock__head">
          <p class="unlock__title">{{ t('pro.unlockTitle') }}</p>
          <button type="button" class="unlock__close" :aria-label="t('common.close')" @click="unlockOpen = false">
            ×
          </button>
        </div>
        <p class="unlock__hint">{{ t('pro.unlockHint') }}</p>
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
          <button type="button" class="unlock__btn" @click="submitUnlock">{{ t('pro.unlock') }}</button>
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

.header__brand {
  margin: 0 0 12px;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--allexo-accent-soft);
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.header__title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.22;
  max-width: 100%;
  text-wrap: balance;
  overflow-wrap: break-word;
  hyphens: auto;
}

@media (max-width: 430px) {
  .header__title {
    font-size: 1.14rem;
    line-height: 1.22;
  }
}

@media (min-width: 640px) {
  .header__title {
    font-size: clamp(2.05rem, 2.65vw, 2.35rem);
    line-height: 1.18;
  }
}

.header__tag {
  margin: 8px 0 0;
  font-size: 1.05rem;
  line-height: 1.45;
  opacity: 0.86;
  max-width: 32rem;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.header__cta {
  margin: 14px 0 0;
  min-height: 3.15rem;
  padding: 0.78rem 1.25rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
  color: #fff;
  font: inherit;
  font-weight: 850;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow:
    0 14px 36px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 0.14s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.header__cta:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.12));
  border-color: rgba(255, 255, 255, 0.44);
  transform: translateY(-1px);
}

.header__cta:active {
  transform: translateY(0);
  box-shadow:
    0 10px 26px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
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
  background: rgba(15, 61, 62, 0.08);
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
  box-shadow: 0 0 0 3px rgba(15, 61, 62, 0.12);
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
  border: 1px solid rgba(15, 61, 62, 0.16);
  background: var(--allexo-teal);
  color: #fff;
  font: inherit;
  font-weight: 850;
  cursor: pointer;
}

.unlock__btn--ghost {
  background: transparent;
  color: var(--allexo-teal);
}

</style>
