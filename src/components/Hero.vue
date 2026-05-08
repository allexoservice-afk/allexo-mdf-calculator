<script setup>
import { useLocale } from '../i18n/useLocale.js'

const { t } = useLocale()

function scrollToCalculator() {
  const el = document.getElementById('calculator')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="header__text">
    <p class="header__brand">ALLEXO</p>
    <h1 class="header__title">{{ t('hero.title') }}</h1>
    <p class="header__tag">{{ t('hero.subtitle') }}</p>
    <button type="button" class="header__cta" @click="scrollToCalculator">
      {{ t('app.calcCta') }}
    </button>
  </div>
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

</style>
